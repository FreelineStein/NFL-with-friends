import type { Conference, Market, MarketEntrant, Markets } from "@/lib/types";
import { conferenceTeams, divisionKey, DIVISION_NAMES, SUPER_BOWL_REACH_CAP } from "@/config/league";

/**
 * Parses an American odds string ("+450", "-120", "EVEN", "+100") to a number.
 * Returns null when the string is not odds.
 */
export function parseAmerican(value: string | number | null | undefined): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value !== 0 ? value : null;
  if (typeof value !== "string") return null;
  const s = value.trim().toUpperCase();
  if (s === "EVEN" || s === "EV" || s === "PK") return 100;
  if (!/^[+-]?\d+$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n === 0 ? null : n;
}

/** Implied probability of American odds including the vig. +100 -> 0.5, -200 -> 0.667, +400 -> 0.2. */
export function impliedProb(american: number | string): number {
  const n = typeof american === "number" ? american : parseAmerican(american);
  if (n === null) return 0;
  return n > 0 ? 100 / (n + 100) : Math.abs(n) / (Math.abs(n) + 100);
}

/** Scales `prob` so the entrants sum to `total` (1 by default), removing the overround. */
export function normalize<T extends { prob: number }>(entrants: T[], total = 1): T[] {
  const sum = entrants.reduce((acc, e) => acc + e.prob, 0);
  if (sum <= 0) return entrants.map((e) => ({ ...e, prob: 0 }));
  return entrants.map((e) => ({ ...e, prob: (e.prob / sum) * total }));
}

export function probOf(market: Market | undefined, abbreviation: string): number {
  return market?.entrants.find((e) => e.abbreviation === abbreviation)?.prob ?? 0;
}

/** Division-winner probability for every team in a conference, from the four division markets. */
export function divisionProbs(markets: Markets, conf: Conference): Record<string, number> {
  const out: Record<string, number> = {};
  for (const div of DIVISION_NAMES) {
    const market = markets[divisionKey(conf, div)];
    for (const e of market?.entrants ?? []) {
      if (e.abbreviation) out[e.abbreviation] = e.prob;
    }
  }
  return out;
}

/**
 * P(wildcard) per team. With a make-playoffs market: P(playoffs) - P(division).
 * Without: 3 * p(1-p) / sum over the conference of p(1-p), which sums to 3 (three slots)
 * and favors strong teams that are not division favorites.
 */
export function wildcardProbs(
  teams: readonly string[],
  divisionProb: Record<string, number>,
  playoffProb?: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = {};
  if (playoffProb) {
    for (const t of teams) {
      out[t] = Math.max(0, (playoffProb[t] ?? 0) - (divisionProb[t] ?? 0));
    }
    return out;
  }
  const weights = teams.map((t) => {
    const p = divisionProb[t] ?? 0;
    return p * (1 - p);
  });
  const sum = weights.reduce((a, b) => a + b, 0);
  teams.forEach((t, i) => {
    out[t] = sum > 0 ? (3 * weights[i]) / sum : 0;
  });
  return out;
}

/**
 * P(reach the Super Bowl) per team. Uses the conference champion market when present,
 * else min(2 * P(win SB), cap).
 */
export function reachSuperBowlProbs(
  teams: readonly string[],
  championMarket: Market | undefined,
  sbWinnerMarket: Market | undefined,
): { probs: Record<string, number>; source: "market" | "derived" } {
  const out: Record<string, number> = {};
  if (championMarket && championMarket.entrants.length > 0) {
    for (const t of teams) out[t] = probOf(championMarket, t);
    return { probs: out, source: "market" };
  }
  for (const t of teams) {
    out[t] = Math.min(2 * probOf(sbWinnerMarket, t), SUPER_BOWL_REACH_CAP);
  }
  return { probs: out, source: "derived" };
}

function entrantsFrom(probs: Record<string, number>, labels: Record<string, string>): MarketEntrant[] {
  return Object.entries(probs)
    .map(([abbr, prob]) => ({ id: abbr, label: labels[abbr] ?? abbr, abbreviation: abbr, prob }))
    .sort((a, b) => b.prob - a.prob);
}

/**
 * Adds the derived markets the scorer needs: afcWildcard / nfcWildcard always, and
 * afcChampion / nfcChampion only when the sportsbook did not list them. Pure.
 */
export function deriveMarkets(
  markets: Markets,
  teamLabels: Record<string, string> = {},
): { markets: Markets; model: { wildcard: "market" | "heuristic"; superBowlTeam: "market" | "derived" } } {
  const out: Markets = { ...markets };
  let wildcardModel: "market" | "heuristic" = "heuristic";
  let sbModel: "market" | "derived" = "market";

  for (const conf of ["AFC", "NFC"] as const) {
    const teams = conferenceTeams(conf);
    const divProb = divisionProbs(markets, conf);

    let playoffProb: Record<string, number> | undefined;
    const makePlayoffs = markets.makePlayoffs;
    if (makePlayoffs && makePlayoffs.entrants.some((e) => e.abbreviation && teams.includes(e.abbreviation))) {
      // Seven playoff spots per conference; scale that conference's entrants to sum to 7.
      const confEntrants = normalize(
        makePlayoffs.entrants.filter((e) => e.abbreviation && teams.includes(e.abbreviation)),
        7,
      );
      playoffProb = {};
      for (const e of confEntrants) playoffProb[e.abbreviation as string] = e.prob;
      wildcardModel = "market";
    }

    const wc = wildcardProbs(teams, divProb, playoffProb);
    const wcKey = conf === "AFC" ? "afcWildcard" : "nfcWildcard";
    out[wcKey] = {
      key: wcKey,
      displayName: `${conf} Wildcard (${playoffProb ? "market" : "heuristic"})`,
      provider: "model",
      entrants: entrantsFrom(wc, teamLabels),
    };

    const champKey = conf === "AFC" ? "afcChampion" : "nfcChampion";
    const reach = reachSuperBowlProbs(teams, markets[champKey], markets.sbWinner);
    if (reach.source === "derived") {
      sbModel = "derived";
      out[champKey] = {
        key: champKey,
        displayName: `${conf} Champion (derived)`,
        provider: "model",
        entrants: entrantsFrom(reach.probs, teamLabels),
      };
    }
  }

  return { markets: out, model: { wildcard: wildcardModel, superBowlTeam: sbModel } };
}
