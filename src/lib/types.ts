export type Conference = "AFC" | "NFC";
export type DivisionName = "East" | "North" | "South" | "West";

/** Normalized ESPN clincher state. Absent stat means null (still open). */
export type ClinchStatus =
  | "division"
  | "wildcard"
  | "playoffs"
  | "eliminated"
  | null;

export interface TeamRecord {
  abbreviation: string;
  id: string;
  displayName: string;
  logoUrl: string;
  conference: Conference;
  division: DivisionName;
  wins: number;
  losses: number;
  ties: number;
  winPct: number;
  /** ESPN displayValue, e.g. "W3", "L2", or "-" before any games. */
  streak: string;
  pointDiff: number;
  /** 0 when unseeded. */
  playoffSeed: number;
  clincher: ClinchStatus;
}

export interface DivisionPicks {
  East: string;
  North: string;
  South: string;
  West: string;
}

/** One participant's entry. Team fields are ESPN abbreviations; player fields are display names. */
export interface PickEntry {
  name: string;
  afcDivisions: DivisionPicks;
  nfcDivisions: DivisionPicks;
  afcWildcards: [string, string, string];
  nfcWildcards: [string, string, string];
  superBowl: { afc: string; nfc: string };
  superBowlWinner: string;
  superBowlMvp: string;
  mvp: string;
  roy: string;
}

export interface MarketEntrant {
  /** ESPN team id or athlete id. */
  id: string;
  /** Team displayName or athlete displayName. */
  label: string;
  /** Present for team markets only. */
  abbreviation?: string;
  /** Raw American odds exactly as listed, e.g. "+450" or "-120". Display this. */
  american: string;
  /** Vig-removed implied probability within this market. Scoring only, never displayed. */
  prob: number;
}

export type MarketKey =
  | "sbWinner"
  | "afcChampion"
  | "nfcChampion"
  | "mvp"
  | "oroy"
  | "sbMvp"
  | "makePlayoffs"
  | "afcEast"
  | "afcNorth"
  | "afcSouth"
  | "afcWest"
  | "nfcEast"
  | "nfcNorth"
  | "nfcSouth"
  | "nfcWest";

export interface Market {
  key: MarketKey;
  displayName: string;
  provider: string;
  entrants: MarketEntrant[];
}

export type Markets = Partial<Record<MarketKey, Market>>;

export interface ModelFlags {
  wildcard: "market" | "heuristic";
  superBowlTeam: "market" | "derived";
}

export type DivisionKey =
  | "afcEast"
  | "afcNorth"
  | "afcSouth"
  | "afcWest"
  | "nfcEast"
  | "nfcNorth"
  | "nfcSouth"
  | "nfcWest";

/** Hand-entered settled outcomes. Every field optional; absent means not settled. */
export interface Results {
  /** Division winners by division key, e.g. { afcEast: "BUF" }. */
  divisions?: Partial<Record<DivisionKey, string>>;
  /** Final wildcard teams per conference. Setting a conference settles all its wildcard picks. */
  wildcards?: { afc?: string[]; nfc?: string[] };
  /** Conference champions (the two Super Bowl teams). */
  conferenceChampions?: { afc?: string; nfc?: string };
  superBowlWinner?: string;
  superBowlMvp?: string;
  mvp?: string;
  oroy?: string;
  /** Teams confirmed out of playoff contention, in case ESPN's flag lags. */
  eliminated?: string[];
}

export type PickStatus = "open" | "correct" | "wrong";

export type PickCategory =
  | DivisionKey
  | "afcWildcard"
  | "nfcWildcard"
  | "superBowlAfc"
  | "superBowlNfc"
  | "superBowlWinner"
  | "superBowlMvp"
  | "mvp"
  | "oroy"
  | "afcSweep"
  | "nfcSweep"
  | "consolation";

export interface ScoredPick {
  category: PickCategory;
  /** Short label for the row, e.g. "AFC East", "AFC WC", "SB winner". */
  label: string;
  /** Team abbreviation, player name, or a description for derived rows. */
  pick: string;
  kind: "team" | "player" | "bonus";
  /** Points if correct (per qualifying team for the consolation row). */
  points: number;
  /** Probability of paying out; 1 or 0 once settled. */
  probability: number;
  status: PickStatus;
  /** points x probability, or the expected value for derived rows. */
  expected: number;
  /** Points already banked. */
  earned: number;
  /** Points still reachable including earned. */
  reachable: number;
  /** Team eliminated from playoff contention (display hint). */
  eliminated?: boolean;
  /** Raw American odds for the pick when a market lists it. Display this, never a percentage. */
  american?: string;
}

export interface ParticipantScore {
  name: string;
  color: string;
  rank: number;
  forecasted: number;
  settled: number;
  maxPossible: number;
  /** The 20 picks in PRD order. */
  picks: ScoredPick[];
  /** AFC sweep, NFC sweep, playoff consolation. */
  bonuses: ScoredPick[];
  /** True once no row is open. */
  final: boolean;
}
