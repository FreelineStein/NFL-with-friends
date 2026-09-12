import type { Results } from "@/lib/types";

/**
 * Hand-entered settled outcomes. Empty at launch. Anything set here overrides
 * what the scorer infers from ESPN clincher flags. Example once things settle:
 *
 *   divisions: { afcEast: "BUF" },
 *   wildcards: { afc: ["LAC", "PIT", "CIN"] },
 *   conferenceChampions: { afc: "BUF" },
 *   superBowlWinner: "BUF",
 *   superBowlMvp: "Josh Allen",
 *   mvp: "Josh Allen",
 *   oroy: "Ashton Jeanty",
 */
export const results: Results = {};
