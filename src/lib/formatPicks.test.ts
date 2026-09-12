import { describe, expect, it } from "vitest";
import type { PickEntry } from "@/lib/types";
import { toLiteral, toSummary } from "@/lib/formatPicks";

const entry: PickEntry = {
  name: " Jacob ",
  afcDivisions: { East: "BUF", North: "BAL", South: "HOU", West: "KC" },
  nfcDivisions: { East: "PHI", North: "DET", South: "TB", West: "LAR" },
  afcWildcards: ["LAC", "CIN", "PIT"],
  nfcWildcards: ["GB", "SF", "WSH"],
  superBowl: { afc: "BUF", nfc: "PHI" },
  superBowlWinner: "BUF",
  superBowlMvp: "Josh Allen",
  mvp: "Josh Allen",
  roy: "Ashton Jeanty",
};

describe("toLiteral", () => {
  it("emits a PickEntry literal that round-trips through eval", () => {
    const literal = toLiteral(entry);
    expect(literal.startsWith("  {\n    name: \"Jacob\",")).toBe(true);
    expect(literal.endsWith("  },")).toBe(true);
    const parsed = new Function(`return [${literal}][0];`)() as PickEntry;
    expect(parsed).toEqual({ ...entry, name: "Jacob" });
  });
});

describe("toSummary", () => {
  it("lists every field on its own line", () => {
    const lines = toSummary(entry).split("\n");
    expect(lines).toHaveLength(9);
    expect(lines[1]).toBe("AFC divisions: East BUF, North BAL, South HOU, West KC");
    expect(lines[5]).toBe("Super Bowl: BUF vs PHI, BUF wins");
  });
});
