import type { PickEntry } from "@/lib/types";
import { DIVISION_NAMES } from "@/config/league";

const q = (s: string) => JSON.stringify(s);

/** A paste-ready `PickEntry` literal for src/config/picks.ts, indented for the array. */
export function toLiteral(entry: PickEntry): string {
  const divs = (d: PickEntry["afcDivisions"]) =>
    `{ ${DIVISION_NAMES.map((n) => `${n}: ${q(d[n])}`).join(", ")} }`;
  const list = (xs: readonly string[]) => `[${xs.map(q).join(", ")}]`;
  return [
    "  {",
    `    name: ${q(entry.name.trim())},`,
    `    afcDivisions: ${divs(entry.afcDivisions)},`,
    `    nfcDivisions: ${divs(entry.nfcDivisions)},`,
    `    afcWildcards: ${list(entry.afcWildcards)},`,
    `    nfcWildcards: ${list(entry.nfcWildcards)},`,
    `    superBowl: { afc: ${q(entry.superBowl.afc)}, nfc: ${q(entry.superBowl.nfc)} },`,
    `    superBowlWinner: ${q(entry.superBowlWinner)},`,
    `    superBowlMvp: ${q(entry.superBowlMvp.trim())},`,
    `    mvp: ${q(entry.mvp.trim())},`,
    `    roy: ${q(entry.roy.trim())},`,
    "  },",
  ].join("\n");
}

/** Plain-text summary for a group chat. */
export function toSummary(entry: PickEntry): string {
  const divs = (d: PickEntry["afcDivisions"]) => DIVISION_NAMES.map((n) => `${n} ${d[n]}`).join(", ");
  return [
    `${entry.name.trim()}'s ${new Date().getFullYear()} NFL picks`,
    `AFC divisions: ${divs(entry.afcDivisions)}`,
    `AFC wildcards: ${entry.afcWildcards.join(", ")}`,
    `NFC divisions: ${divs(entry.nfcDivisions)}`,
    `NFC wildcards: ${entry.nfcWildcards.join(", ")}`,
    `Super Bowl: ${entry.superBowl.afc} vs ${entry.superBowl.nfc}, ${entry.superBowlWinner} wins`,
    `Super Bowl MVP: ${entry.superBowlMvp.trim()}`,
    `MVP: ${entry.mvp.trim()}`,
    `Offensive Rookie of the Year: ${entry.roy.trim()}`,
  ].join("\n");
}
