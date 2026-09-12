import type {
  Conference,
  DivisionKey,
  DivisionName,
  Market,
  Markets,
  ParticipantScore,
  PickEntry,
  PickStatus,
  Results,
  ScoredPick,
  TeamRecord,
} from "@/lib/types";
import {
  DIVISION_NAMES,
  PARTICIPANT_COLORS,
  POINTS,
  UNLISTED_PLAYER_PROB,
  divisionKey,
  teamConference,
  teamDivision,
} from "@/config/league";

/** Case-insensitive, punctuation-insensitive name key for matching picks to market labels. */
export function nameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findPlayer(market: Market | undefined, name: string) {
  const key = nameKey(name);
  return market?.entrants.find((e) => nameKey(e.label) === key);
}

function findTeam(market: Market | undefined, abbr: string) {
  return market?.entrants.find((e) => e.abbreviation === abbr);
}

/** Only show odds that came from a sportsbook, never from the model. */
function listedOdds(market: Market | undefined, entrant: { american?: string } | undefined) {
  if (!market || market.provider === "model") return undefined;
  return entrant?.american;
}

type Outcome = PickStatus;

/** Everything the scorer needs to know about the state of the league. */
class LeagueState {
  private teams = new Map<string, TeamRecord>();

  constructor(
    teams: TeamRecord[],
    private markets: Markets,
    private results: Results,
  ) {
    for (const t of teams) this.teams.set(t.abbreviation, t);
  }

  isEliminated(abbr: string): boolean {
    if (this.results.eliminated?.includes(abbr)) return true;
    return this.teams.get(abbr)?.clincher === "eliminated";
  }

  clinch(abbr: string) {
    return this.teams.get(abbr)?.clincher ?? null;
  }

  /** Settled division winner or null while open. results.ts wins over ESPN. */
  divisionWinner(key: DivisionKey): string | null {
    const fromResults = this.results.divisions?.[key];
    if (fromResults) return fromResults;
    for (const t of this.teams.values()) {
      if (t.clincher === "division" && divisionKey(t.conference, t.division) === key) return t.abbreviation;
    }
    return null;
  }

  private divisionKeyOf(abbr: string): DivisionKey | null {
    const conf = teamConference(abbr);
    const div = teamDivision(abbr);
    return conf && div ? divisionKey(conf, div) : null;
  }

  /** Does `abbr` win its division? */
  winsDivision(abbr: string): Outcome {
    const key = this.divisionKeyOf(abbr);
    if (!key) return "wrong";
    const winner = this.divisionWinner(key);
    if (winner) return winner === abbr ? "correct" : "wrong";
    if (this.isEliminated(abbr)) return "wrong";
    if (this.clinch(abbr) === "wildcard") return "wrong";
    return "open";
  }

  /** Is `abbr` a wildcard? */
  isWildcard(abbr: string): Outcome {
    const conf = teamConference(abbr);
    if (!conf) return "wrong";
    const list = this.results.wildcards?.[conf === "AFC" ? "afc" : "nfc"];
    if (list) return list.includes(abbr) ? "correct" : "wrong";
    if (this.clinch(abbr) === "wildcard") return "correct";
    if (this.winsDivision(abbr) === "correct") return "wrong";
    if (this.isEliminated(abbr)) return "wrong";
    return "open";
  }

  /** Does `abbr` reach the Super Bowl as its conference's champion? */
  reachesSuperBowl(abbr: string, conf: Conference): Outcome {
    const champ = this.results.conferenceChampions?.[conf === "AFC" ? "afc" : "nfc"];
    if (champ) return champ === abbr ? "correct" : "wrong";
    if (this.results.superBowlWinner === abbr) return "correct";
    if (this.isEliminated(abbr)) return "wrong";
    return "open";
  }

  winsSuperBowl(abbr: string): Outcome {
    const winner = this.results.superBowlWinner;
    if (winner) return winner === abbr ? "correct" : "wrong";
    const champs = this.results.conferenceChampions;
    if (champs?.afc && champs?.nfc && champs.afc !== abbr && champs.nfc !== abbr) return "wrong";
    if (this.isEliminated(abbr)) return "wrong";
    return "open";
  }

  award(field: "superBowlMvp" | "mvp" | "oroy", name: string): Outcome {
    const settled = this.results[field];
    if (!settled) return "open";
    return nameKey(settled) === nameKey(name) ? "correct" : "wrong";
  }

  divisionProb(abbr: string): number {
    const key = this.divisionKeyOf(abbr);
    return key ? (findTeam(this.markets[key], abbr)?.prob ?? 0) : 0;
  }

  wildcardProb(abbr: string): number {
    const conf = teamConference(abbr);
    if (!conf) return 0;
    return findTeam(this.markets[conf === "AFC" ? "afcWildcard" : "nfcWildcard"], abbr)?.prob ?? 0;
  }

  market(key: keyof Markets): Market | undefined {
    return this.markets[key];
  }
}

function probFor(status: Outcome, open: number): number {
  return status === "correct" ? 1 : status === "wrong" ? 0 : open;
}

function row(
  base: Omit<ScoredPick, "expected" | "earned" | "reachable" | "probability" | "status">,
  status: Outcome,
  openProb: number,
): ScoredPick {
  const probability = probFor(status, openProb);
  return {
    ...base,
    status,
    probability,
    expected: base.points * probability,
    earned: status === "correct" ? base.points : 0,
    reachable: status === "wrong" ? 0 : base.points,
  };
}

function confLabel(conf: Conference, div: DivisionName) {
  return `${conf} ${div}`;
}

function scoreEntry(entry: PickEntry, state: LeagueState): Omit<ParticipantScore, "rank" | "color"> {
  const picks: ScoredPick[] = [];
  const divisionRows: Record<Conference, ScoredPick[]> = { AFC: [], NFC: [] };
  // Team picks that can earn a consolation: [team, kind of pick].
  const consolationPaths: { team: string; main: ScoredPick; asWildcard: boolean }[] = [];

  for (const conf of ["AFC", "NFC"] as const) {
    const divs = conf === "AFC" ? entry.afcDivisions : entry.nfcDivisions;
    for (const div of DIVISION_NAMES) {
      const abbr = divs[div];
      const key = divisionKey(conf, div);
      const r = row(
        {
          category: key,
          label: confLabel(conf, div),
          pick: abbr,
          kind: "team",
          points: POINTS.division,
          eliminated: state.isEliminated(abbr),
          american: listedOdds(state.market(key), findTeam(state.market(key), abbr)),
        },
        state.winsDivision(abbr),
        state.divisionProb(abbr),
      );
      picks.push(r);
      divisionRows[conf].push(r);
      consolationPaths.push({ team: abbr, main: r, asWildcard: true });
    }
  }

  for (const conf of ["AFC", "NFC"] as const) {
    const wcs = conf === "AFC" ? entry.afcWildcards : entry.nfcWildcards;
    for (const abbr of wcs) {
      const r = row(
        {
          category: conf === "AFC" ? "afcWildcard" : "nfcWildcard",
          label: `${conf} WC`,
          pick: abbr,
          kind: "team",
          points: POINTS.wildcard,
          eliminated: state.isEliminated(abbr),
        },
        state.isWildcard(abbr),
        state.wildcardProb(abbr),
      );
      picks.push(r);
      consolationPaths.push({ team: abbr, main: r, asWildcard: false });
    }
  }

  for (const conf of ["AFC", "NFC"] as const) {
    const abbr = conf === "AFC" ? entry.superBowl.afc : entry.superBowl.nfc;
    const key = conf === "AFC" ? "afcChampion" : "nfcChampion";
    const market = state.market(key);
    const entrant = findTeam(market, abbr);
    picks.push(
      row(
        {
          category: conf === "AFC" ? "superBowlAfc" : "superBowlNfc",
          label: `SB team (${conf})`,
          pick: abbr,
          kind: "team",
          points: POINTS.superBowlTeam,
          eliminated: state.isEliminated(abbr),
          american: listedOdds(market, entrant),
        },
        state.reachesSuperBowl(abbr, conf),
        entrant?.prob ?? 0,
      ),
    );
  }

  {
    const abbr = entry.superBowlWinner;
    const market = state.market("sbWinner");
    const entrant = findTeam(market, abbr);
    picks.push(
      row(
        {
          category: "superBowlWinner",
          label: "SB winner",
          pick: abbr,
          kind: "team",
          points: POINTS.superBowlWinner,
          eliminated: state.isEliminated(abbr),
          american: listedOdds(market, entrant),
        },
        state.winsSuperBowl(abbr),
        entrant?.prob ?? 0,
      ),
    );
  }

  const awards = [
    { category: "superBowlMvp", label: "SB MVP", field: "superBowlMvp", marketKey: "sbMvp", points: POINTS.superBowlMvp },
    { category: "mvp", label: "MVP", field: "mvp", marketKey: "mvp", points: POINTS.mvp },
    { category: "oroy", label: "OROY", field: "oroy", marketKey: "oroy", points: POINTS.oroy },
  ] as const;
  for (const a of awards) {
    const name = entry[a.field === "oroy" ? "roy" : a.field];
    const market = state.market(a.marketKey);
    const entrant = findPlayer(market, name);
    picks.push(
      row(
        {
          category: a.category,
          label: a.label,
          pick: name,
          kind: "player",
          points: a.points,
          american: listedOdds(market, entrant),
        },
        state.award(a.field, name),
        entrant?.prob ?? UNLISTED_PLAYER_PROB,
      ),
    );
  }

  const bonuses: ScoredPick[] = [];
  for (const conf of ["AFC", "NFC"] as const) {
    const rows = divisionRows[conf];
    const status: Outcome = rows.some((r) => r.status === "wrong")
      ? "wrong"
      : rows.every((r) => r.status === "correct")
        ? "correct"
        : "open";
    bonuses.push(
      row(
        {
          category: conf === "AFC" ? "afcSweep" : "nfcSweep",
          label: `${conf} sweep`,
          pick: rows.map((r) => r.pick).join(" "),
          kind: "bonus",
          points: POINTS.divisionSweep,
        },
        status,
        rows.reduce((acc, r) => acc * r.probability, 1),
      ),
    );
  }

  // Consolation: one row summarizing every team pick that landed in the right playoff
  // field but the wrong slot. Never pays alongside a correct pick on the same team, and
  // never adds to maxPossible while the main pick is still open (the 10 already counts).
  let consEarned = 0;
  let consExpected = 0;
  let consReachable = 0;
  let consOpen = 0;
  const consTeams: string[] = [];
  for (const path of consolationPaths) {
    if (path.main.status === "correct") continue;
    const outcome = path.asWildcard ? state.isWildcard(path.team) : state.winsDivision(path.team);
    if (outcome === "correct") {
      consEarned += POINTS.playoffConsolation;
      consTeams.push(`${path.team} (${path.asWildcard ? "WC" : "div"})`);
    } else if (outcome === "open") {
      consOpen += 1;
      const p = path.asWildcard ? state.wildcardProb(path.team) : state.divisionProb(path.team);
      consExpected += POINTS.playoffConsolation * p;
      if (path.main.status === "wrong") consReachable += POINTS.playoffConsolation;
    }
  }
  bonuses.push({
    category: "consolation",
    label: "Playoff consolation",
    pick: consTeams.join(", ") || (consOpen > 0 ? "open" : "none"),
    kind: "bonus",
    points: POINTS.playoffConsolation,
    // Expected count of consolations still open; not a single-event probability.
    probability: consExpected / POINTS.playoffConsolation,
    status: consOpen > 0 ? "open" : consEarned > 0 ? "correct" : "wrong",
    expected: consEarned + consExpected,
    earned: consEarned,
    reachable: consEarned + consReachable,
  });

  const all = [...picks, ...bonuses];
  return {
    name: entry.name,
    forecasted: all.reduce((a, r) => a + r.expected, 0),
    settled: all.reduce((a, r) => a + r.earned, 0),
    maxPossible: all.reduce((a, r) => a + r.reachable, 0),
    picks,
    bonuses,
    final: all.every((r) => r.status !== "open"),
  };
}

/**
 * Scores every participant against the current league state. Pure: same inputs,
 * same output. Ranked by forecasted points, or by settled points once nothing is open.
 */
export function scoreParticipants(
  entries: PickEntry[],
  teams: TeamRecord[],
  markets: Markets,
  results: Results,
): ParticipantScore[] {
  const state = new LeagueState(teams, markets, results);
  const scored: ParticipantScore[] = entries.map((entry, i) => ({
    ...scoreEntry(entry, state),
    color: PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length],
    rank: 0,
  }));

  const allFinal = scored.length > 0 && scored.every((s) => s.final);
  const metric = (s: ParticipantScore) => (allFinal ? s.settled : s.forecasted);
  const round = (n: number) => Math.round(n * 1e6) / 1e6;
  scored.sort((a, b) => metric(b) - metric(a) || b.settled - a.settled || a.name.localeCompare(b.name));

  let rank = 1;
  scored.forEach((s, i) => {
    if (i > 0 && round(metric(s)) !== round(metric(scored[i - 1]))) rank = i + 1;
    s.rank = rank;
  });
  return scored;
}
