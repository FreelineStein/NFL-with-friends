import type { PickEntry } from "@/lib/types";
import { validateParticipants } from "@/lib/validatePicks";

/**
 * Participant entries for the season. Paste the literal produced by /picks here.
 * The two entries below are placeholders; replace them as real picks arrive.
 */
export const participants: PickEntry[] = [
  {
    name: "Sample A",
    afcDivisions: { East: "BUF", North: "BAL", South: "HOU", West: "KC" },
    nfcDivisions: { East: "PHI", North: "DET", South: "TB", West: "LAR" },
    afcWildcards: ["LAC", "CIN", "PIT"],
    nfcWildcards: ["GB", "SF", "WSH"],
    superBowl: { afc: "BUF", nfc: "PHI" },
    superBowlWinner: "BUF",
    superBowlMvp: "Josh Allen",
    mvp: "Josh Allen",
    roy: "Ashton Jeanty",
  },
  {
    name: "Sample B",
    afcDivisions: { East: "NE", North: "PIT", South: "JAX", West: "DEN" },
    nfcDivisions: { East: "WSH", North: "GB", South: "CAR", West: "SEA" },
    afcWildcards: ["BUF", "BAL", "KC"],
    nfcWildcards: ["PHI", "DET", "LAR"],
    superBowl: { afc: "DEN", nfc: "SEA" },
    superBowlWinner: "SEA",
    superBowlMvp: "Sam Darnold",
    mvp: "Patrick Mahomes",
    roy: "Cam Ward",
  },
];

const problems = validateParticipants(participants);
for (const problem of problems) {
  console.error(`Picks config error: ${problem}`);
}
