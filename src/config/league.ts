import type { Conference, DivisionKey, DivisionName, MarketKey } from "@/lib/types";

export const SEASON = 2026;

/** Picks lock at 2026-09-13 11:00 Mountain. */
export const LOCK_AT = "2026-09-13T17:00:00Z";

export const POINTS = {
  division: 10,
  wildcard: 10,
  superBowlTeam: 30,
  superBowlWinner: 50,
  superBowlMvp: 30,
  mvp: 50,
  oroy: 30,
  divisionSweep: 20,
  playoffConsolation: 5,
} as const;

/** 80 division + 60 wildcard + 60 SB teams + 50 winner + 30 SB MVP + 50 MVP + 30 OROY + 40 sweeps. */
export const MAX_POINTS = 400;

export const CONFERENCES: readonly Conference[] = ["AFC", "NFC"];
export const DIVISION_NAMES: readonly DivisionName[] = ["East", "North", "South", "West"];

/** Abbreviations confirmed against the live standings feed (docs/espn-shapes.md). */
export const DIVISIONS: Record<Conference, Record<DivisionName, readonly string[]>> = {
  AFC: {
    East: ["BUF", "MIA", "NE", "NYJ"],
    North: ["BAL", "CIN", "CLE", "PIT"],
    South: ["HOU", "IND", "JAX", "TEN"],
    West: ["DEN", "KC", "LV", "LAC"],
  },
  NFC: {
    East: ["DAL", "NYG", "PHI", "WSH"],
    North: ["CHI", "DET", "GB", "MIN"],
    South: ["ATL", "CAR", "NO", "TB"],
    West: ["ARI", "LAR", "SF", "SEA"],
  },
};

const TEAM_INDEX: Record<string, { conference: Conference; division: DivisionName }> = {};
for (const conf of CONFERENCES) {
  for (const div of DIVISION_NAMES) {
    for (const abbr of DIVISIONS[conf][div]) {
      TEAM_INDEX[abbr] = { conference: conf, division: div };
    }
  }
}

export const ALL_TEAMS: readonly string[] = Object.keys(TEAM_INDEX);

export function conferenceTeams(conf: Conference): string[] {
  return DIVISION_NAMES.flatMap((d) => [...DIVISIONS[conf][d]]);
}

export function teamConference(abbr: string): Conference | undefined {
  return TEAM_INDEX[abbr]?.conference;
}

export function teamDivision(abbr: string): DivisionName | undefined {
  return TEAM_INDEX[abbr]?.division;
}

export function isKnownTeam(abbr: string): boolean {
  return abbr in TEAM_INDEX;
}

export function divisionKey(conf: Conference, div: DivisionName): DivisionKey {
  return `${conf.toLowerCase()}${div}` as DivisionKey;
}

export const DIVISION_KEYS: readonly DivisionKey[] = CONFERENCES.flatMap((c) =>
  DIVISION_NAMES.map((d) => divisionKey(c, d)),
);

export function divisionKeyLabel(key: DivisionKey): string {
  return `${key.slice(0, 3).toUpperCase()} ${key.slice(3)}`;
}

/** First provider present wins for each market; no averaging. */
export const PROVIDER_PREFERENCE = ["DraftKings", "FanDuel", "ESPN BET"];

/**
 * Exact ESPN futures displayName strings (docs/espn-shapes.md). `sbMvp` and
 * `makePlayoffs` were not in the 2026 feed; the strings are best guesses so the
 * lookup starts working if ESPN adds them, and the app tolerates their absence.
 */
export const MARKETS: Record<MarketKey, string> = {
  sbWinner: "Super Bowl Winner",
  afcChampion: "AFC Champion",
  nfcChampion: "NFC Champion",
  mvp: "Regular Season MVP",
  oroy: "Offensive Rookie of the Year",
  sbMvp: "Super Bowl MVP",
  makePlayoffs: "To Make the Playoffs",
  afcEast: "AFC East Division Winner",
  afcNorth: "AFC North Division Winner",
  afcSouth: "AFC South Division Winner",
  afcWest: "AFC West Division Winner",
  nfcEast: "NFC East Division Winner",
  nfcNorth: "NFC North Division Winner",
  nfcSouth: "NFC South Division Winner",
  nfcWest: "NFC West Division Winner",
};

/** Award pick not listed in its market. */
export const UNLISTED_PLAYER_PROB = 0.005;

/** Cap on the derived P(reach Super Bowl) when no conference champion market exists. */
export const SUPER_BOWL_REACH_CAP = 0.95;

/** Athlete refs resolved per player market, by shortest odds. */
export const ATHLETE_RESOLVE_CAP = 25;

/** MLB palette first, extended for a larger group. */
export const PARTICIPANT_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#ea580c", // orange
  "#9333ea", // purple
  "#0d9488", // teal
  "#db2777", // pink
  "#ca8a04", // yellow
  "#4f46e5", // indigo
  "#65a30d", // lime
];

export function teamLogoUrl(abbr: string): string {
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr.toLowerCase()}.png`;
}
