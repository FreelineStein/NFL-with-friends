import type { Conference, DivisionName, PickEntry } from "@/lib/types";
import { DIVISIONS, DIVISION_NAMES, isKnownTeam } from "@/config/league";

const DIVISION_FIELD: Record<Conference, "afcDivisions" | "nfcDivisions"> = {
  AFC: "afcDivisions",
  NFC: "nfcDivisions",
};
const WILDCARD_FIELD: Record<Conference, "afcWildcards" | "nfcWildcards"> = {
  AFC: "afcWildcards",
  NFC: "nfcWildcards",
};
const SB_FIELD: Record<Conference, "afc" | "nfc"> = { AFC: "afc", NFC: "nfc" };

/** The seven playoff teams a participant picked for a conference. */
export function playoffPicks(entry: PickEntry, conf: Conference): string[] {
  const divs = entry[DIVISION_FIELD[conf]];
  return [...DIVISION_NAMES.map((d) => divs[d]), ...entry[WILDCARD_FIELD[conf]]].filter(Boolean);
}

/**
 * Returns a list of human-readable problems; empty means valid. Shared by the
 * config loader and the pick sheet so both enforce the same rules.
 */
export function validatePickEntry(entry: PickEntry): string[] {
  const errors: string[] = [];
  const who = entry.name?.trim() || "(unnamed)";

  if (!entry.name || !entry.name.trim()) {
    errors.push("Name is required.");
  }

  for (const conf of ["AFC", "NFC"] as const) {
    const divs = entry[DIVISION_FIELD[conf]];
    const winners: string[] = [];
    for (const div of DIVISION_NAMES as readonly DivisionName[]) {
      const abbr = divs?.[div];
      if (!abbr) {
        errors.push(`${who}: ${conf} ${div} winner is missing.`);
        continue;
      }
      if (!isKnownTeam(abbr)) {
        errors.push(`${who}: ${conf} ${div} winner "${abbr}" is not a known team.`);
        continue;
      }
      if (!DIVISIONS[conf][div].includes(abbr)) {
        errors.push(`${who}: ${abbr} is not in the ${conf} ${div}.`);
        continue;
      }
      winners.push(abbr);
    }

    const wildcards = entry[WILDCARD_FIELD[conf]] ?? [];
    if (wildcards.length !== 3) {
      errors.push(`${who}: ${conf} needs exactly 3 wildcards, got ${wildcards.length}.`);
    }
    const seen = new Set<string>();
    for (const abbr of wildcards) {
      if (!abbr) {
        errors.push(`${who}: ${conf} wildcard is missing.`);
        continue;
      }
      if (!isKnownTeam(abbr)) {
        errors.push(`${who}: ${conf} wildcard "${abbr}" is not a known team.`);
        continue;
      }
      if (!DIVISION_NAMES.some((d) => DIVISIONS[conf][d].includes(abbr))) {
        errors.push(`${who}: ${conf} wildcard ${abbr} is not an ${conf} team.`);
        continue;
      }
      if (winners.includes(abbr)) {
        errors.push(`${who}: ${abbr} cannot be both an ${conf} division winner and an ${conf} wildcard.`);
      }
      if (seen.has(abbr)) {
        errors.push(`${who}: ${abbr} is listed twice as an ${conf} wildcard.`);
      }
      seen.add(abbr);
    }

    const sbTeam = entry.superBowl?.[SB_FIELD[conf]];
    if (!sbTeam) {
      errors.push(`${who}: ${conf} Super Bowl team is missing.`);
    } else if (!playoffPicks(entry, conf).includes(sbTeam)) {
      errors.push(`${who}: ${conf} Super Bowl team ${sbTeam} is not among their ${conf} playoff picks.`);
    }
  }

  const sbTeams = [entry.superBowl?.afc, entry.superBowl?.nfc].filter(Boolean);
  if (!entry.superBowlWinner) {
    errors.push(`${who}: Super Bowl winner is missing.`);
  } else if (!sbTeams.includes(entry.superBowlWinner)) {
    errors.push(`${who}: Super Bowl winner ${entry.superBowlWinner} is not one of their two Super Bowl teams.`);
  }

  for (const [field, label] of [
    ["superBowlMvp", "Super Bowl MVP"],
    ["mvp", "MVP"],
    ["roy", "Offensive Rookie of the Year"],
  ] as const) {
    if (!entry[field] || !entry[field].trim()) {
      errors.push(`${who}: ${label} is missing.`);
    }
  }

  return errors;
}

/** Validates a whole participant list, including duplicate names. */
export function validateParticipants(entries: PickEntry[]): string[] {
  const errors = entries.flatMap(validatePickEntry);
  const names = new Map<string, number>();
  for (const e of entries) {
    const key = e.name.trim().toLowerCase();
    names.set(key, (names.get(key) ?? 0) + 1);
  }
  for (const [name, count] of names) {
    if (count > 1) errors.push(`Participant name "${name}" appears ${count} times.`);
  }
  return errors;
}
