import type { ClinchStatus, Conference, DivisionName, TeamRecord } from "@/lib/types";
import { teamConference, teamDivision, teamLogoUrl } from "@/config/league";

/** level=3 is required to get conference -> division -> entries (docs/espn-shapes.md). */
export const STANDINGS_URL =
  "https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3";

export const STANDINGS_REVALIDATE_SECONDS = 3600;

interface ESPNStat {
  name?: string;
  type?: string;
  value?: number | null;
  displayValue?: string;
}

interface ESPNTeam {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  logos?: { href?: string }[];
}

interface ESPNEntry {
  team?: ESPNTeam;
  stats?: ESPNStat[];
}

interface ESPNGroup {
  name?: string;
  abbreviation?: string;
  children?: ESPNGroup[];
  standings?: { entries?: ESPNEntry[] };
}

interface ESPNStandingsResponse {
  children?: ESPNGroup[];
}

function stat(stats: ESPNStat[], name: string): ESPNStat | undefined {
  return stats.find((s) => s.name === name);
}

function statNumber(stats: ESPNStat[], name: string): number {
  const v = stat(stats, name)?.value;
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

export function parseClincher(code: string | undefined): ClinchStatus {
  switch (code) {
    case "z":
    case "*":
      return "division";
    case "y":
      return "wildcard";
    case "x":
      return "playoffs";
    case "e":
      return "eliminated";
    default:
      return null;
  }
}

function conferenceFromGroup(group: ESPNGroup): Conference | undefined {
  if (group.abbreviation === "AFC" || group.abbreviation === "NFC") return group.abbreviation;
  if (group.name?.startsWith("American")) return "AFC";
  if (group.name?.startsWith("National")) return "NFC";
  return undefined;
}

function divisionFromGroup(group: ESPNGroup): DivisionName | undefined {
  const name = group.name ?? "";
  for (const d of ["East", "North", "South", "West"] as const) {
    if (name.endsWith(d)) return d;
  }
  return undefined;
}

/** Pure parser. Fails soft: skips entries it cannot place, never throws on missing fields. */
export function parseStandings(data: ESPNStandingsResponse): TeamRecord[] {
  const teams: TeamRecord[] = [];
  for (const confGroup of data.children ?? []) {
    const feedConf = conferenceFromGroup(confGroup);
    // Tolerate a flat conference-level feed (no division children) by reading its entries directly.
    const divisionGroups = confGroup.children?.length ? confGroup.children : [confGroup];
    for (const divGroup of divisionGroups) {
      const feedDiv = divisionFromGroup(divGroup);
      for (const entry of divGroup.standings?.entries ?? []) {
        const team = entry.team;
        const abbr = team?.abbreviation;
        if (!team || !abbr) continue;
        const conference = teamConference(abbr) ?? feedConf;
        const division = teamDivision(abbr) ?? feedDiv;
        if (!conference || !division) {
          console.error(`standings: cannot place team ${abbr}; skipping`);
          continue;
        }
        const stats = entry.stats ?? [];
        teams.push({
          abbreviation: abbr,
          id: team.id ?? "",
          displayName: team.displayName ?? abbr,
          logoUrl: team.logos?.[0]?.href ?? teamLogoUrl(abbr),
          conference,
          division,
          wins: statNumber(stats, "wins"),
          losses: statNumber(stats, "losses"),
          ties: statNumber(stats, "ties"),
          winPct: statNumber(stats, "winPercent"),
          streak: stat(stats, "streak")?.displayValue ?? "-",
          pointDiff: statNumber(stats, "pointDifferential"),
          playoffSeed: statNumber(stats, "playoffSeed"),
          clincher: parseClincher(stat(stats, "clincher")?.displayValue),
        });
      }
    }
  }
  return teams;
}

export function buildTeamIdMap(teams: TeamRecord[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const t of teams) if (t.id) map[t.id] = t.abbreviation;
  return map;
}

/** Server only. Cached by the Vercel data cache for an hour. */
export async function fetchStandings(): Promise<TeamRecord[]> {
  const res = await fetch(STANDINGS_URL, {
    next: { revalidate: STANDINGS_REVALIDATE_SECONDS },
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`ESPN standings returned ${res.status}`);
  const data = (await res.json()) as ESPNStandingsResponse;
  const teams = parseStandings(data);
  if (teams.length === 0) throw new Error("ESPN standings parsed to zero teams");
  return teams;
}
