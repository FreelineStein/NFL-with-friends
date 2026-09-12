import type { Market, MarketEntrant, MarketKey, Markets } from "@/lib/types";
import { ATHLETE_RESOLVE_CAP, MARKETS, PROVIDER_PREFERENCE, SEASON } from "@/config/league";
import { impliedProb, normalize, parseAmerican } from "@/lib/odds";

export const FUTURES_URL = `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/${SEASON}/futures?limit=200`;

export const FUTURES_REVALIDATE_SECONDS = 21600;

interface ESPNRef {
  $ref?: string;
}

interface ESPNBook {
  team?: ESPNRef;
  athlete?: ESPNRef;
  value?: string | number;
}

interface ESPNFuture {
  provider?: { id?: string; name?: string; priority?: number };
  books?: ESPNBook[];
}

interface ESPNFutureItem {
  id?: string;
  name?: string;
  displayName?: string;
  futures?: ESPNFuture[];
}

interface ESPNFuturesResponse {
  items?: ESPNFutureItem[];
}

interface ESPNAthlete {
  id?: string;
  displayName?: string;
  fullName?: string;
  shortName?: string;
}

/** Athlete display names, cached for the life of the serverless instance. */
const athleteCache = new Map<string, string>();

function refId(ref: ESPNRef | undefined): string | null {
  const m = ref?.$ref?.match(/\/(\d+)(?:\?|$)/);
  return m ? m[1] : null;
}

function pickProvider(futures: ESPNFuture[]): ESPNFuture | undefined {
  for (const name of PROVIDER_PREFERENCE) {
    const hit = futures.find((f) => f.provider?.name === name && (f.books?.length ?? 0) > 0);
    if (hit) return hit;
  }
  return futures.find((f) => (f.books?.length ?? 0) > 0);
}

async function resolveAthlete(ref: string): Promise<string | null> {
  const id = ref.match(/athletes\/(\d+)/)?.[1] ?? ref;
  const cached = athleteCache.get(id);
  if (cached) return cached;
  try {
    const res = await fetch(ref.replace(/^http:/, "https:"), {
      next: { revalidate: 86400 },
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const athlete = (await res.json()) as ESPNAthlete;
    const name = athlete.displayName ?? athlete.fullName ?? null;
    if (name) athleteCache.set(id, name);
    return name;
  } catch (err) {
    console.error(`futures: athlete ${id} lookup failed`, err);
    return null;
  }
}

interface RawEntrant {
  id: string;
  american: string;
  prob: number;
  teamAbbr?: string;
  athleteRef?: string;
}

function rawEntrants(books: ESPNBook[], teamIdToAbbr: Record<string, string>): RawEntrant[] {
  const out: RawEntrant[] = [];
  for (const book of books) {
    const odds = parseAmerican(book.value);
    if (odds === null) continue;
    const american = typeof book.value === "string" ? book.value.trim() : `${odds > 0 ? "+" : ""}${odds}`;
    const prob = impliedProb(odds);
    if (book.team) {
      const id = refId(book.team);
      if (!id) continue;
      out.push({ id, american, prob, teamAbbr: teamIdToAbbr[id] });
    } else if (book.athlete) {
      const id = refId(book.athlete);
      if (!id || !book.athlete.$ref) continue;
      out.push({ id, american, prob, athleteRef: book.athlete.$ref });
    }
  }
  return out;
}

async function buildMarket(
  key: MarketKey,
  item: ESPNFutureItem,
  teamIdToAbbr: Record<string, string>,
  teamLabels: Record<string, string>,
): Promise<Market | null> {
  const future = pickProvider(item.futures ?? []);
  if (!future) return null;
  // Normalize over every listed entrant so probabilities are right even for the ones we drop.
  const raw = normalize(rawEntrants(future.books ?? [], teamIdToAbbr)).sort((a, b) => b.prob - a.prob);
  const entrants: MarketEntrant[] = [];

  const teamRows = raw.filter((r) => r.teamAbbr !== undefined || !r.athleteRef);
  for (const r of teamRows) {
    if (!r.teamAbbr) {
      console.error(`futures: ${key} team id ${r.id} not in standings; skipping`);
      continue;
    }
    entrants.push({
      id: r.id,
      label: teamLabels[r.teamAbbr] ?? r.teamAbbr,
      abbreviation: r.teamAbbr,
      american: r.american,
      prob: r.prob,
    });
  }

  const athleteRows = raw.filter((r) => r.athleteRef).slice(0, ATHLETE_RESOLVE_CAP);
  const names = await Promise.all(athleteRows.map((r) => resolveAthlete(r.athleteRef as string)));
  athleteRows.forEach((r, i) => {
    const label = names[i];
    if (!label) return;
    entrants.push({ id: r.id, label, american: r.american, prob: r.prob });
  });

  return {
    key,
    displayName: item.displayName ?? key,
    provider: future.provider?.name ?? "unknown",
    entrants,
  };
}

/**
 * Fetches the futures feed and builds one Market per configured key that exists in
 * the feed. Missing markets are simply absent. Never throws on a bad item.
 */
export async function fetchFutures(
  teamIdToAbbr: Record<string, string>,
  teamLabels: Record<string, string> = {},
): Promise<Markets> {
  const res = await fetch(FUTURES_URL, {
    next: { revalidate: FUTURES_REVALIDATE_SECONDS },
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ESPN futures returned ${res.status}`);
  const data = (await res.json()) as ESPNFuturesResponse;
  const byName = new Map<string, ESPNFutureItem>();
  for (const item of data.items ?? []) {
    if (item.displayName) byName.set(item.displayName, item);
  }

  const markets: Markets = {};
  const keys = Object.keys(MARKETS) as MarketKey[];
  await Promise.all(
    keys.map(async (key) => {
      const item = byName.get(MARKETS[key]);
      if (!item) return;
      try {
        const market = await buildMarket(key, item, teamIdToAbbr, teamLabels);
        if (market && market.entrants.length > 0) markets[key] = market;
      } catch (err) {
        console.error(`futures: failed to build ${key}`, err);
      }
    }),
  );
  return markets;
}
