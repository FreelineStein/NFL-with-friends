import { describe, expect, it } from "vitest";
import type { PickEntry } from "@/lib/types";
import { validatePickEntry, validateParticipants } from "@/lib/validatePicks";

const valid: PickEntry = {
  name: "Tester",
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

describe("validatePickEntry", () => {
  it("accepts a valid entry", () => {
    expect(validatePickEntry(valid)).toEqual([]);
  });

  it("rejects a wildcard that duplicates the same conference's division winner", () => {
    const entry: PickEntry = { ...valid, afcWildcards: ["BUF", "CIN", "PIT"] };
    const errors = validatePickEntry(entry);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/BUF cannot be both an AFC division winner and an AFC wildcard/);
  });

  it("rejects duplicate wildcards", () => {
    const entry: PickEntry = { ...valid, nfcWildcards: ["GB", "GB", "WSH"] };
    const errors = validatePickEntry(entry);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/GB is listed twice as an NFC wildcard/);
  });

  it("rejects a Super Bowl team outside the participant's playoff picks", () => {
    const entry: PickEntry = { ...valid, superBowl: { afc: "NYJ", nfc: "PHI" }, superBowlWinner: "PHI" };
    const errors = validatePickEntry(entry);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/AFC Super Bowl team NYJ is not among their AFC playoff picks/);
  });

  it("rejects a Super Bowl winner that is not one of the two Super Bowl teams", () => {
    const entry: PickEntry = { ...valid, superBowlWinner: "KC" };
    const errors = validatePickEntry(entry);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/Super Bowl winner KC is not one of their two Super Bowl teams/);
  });

  it("rejects an unknown abbreviation and a team in the wrong division", () => {
    const entry: PickEntry = {
      ...valid,
      afcDivisions: { ...valid.afcDivisions, East: "XXX" },
      nfcDivisions: { ...valid.nfcDivisions, North: "DAL" },
    };
    const errors = validatePickEntry(entry);
    expect(errors.some((e) => /"XXX" is not a known team/.test(e))).toBe(true);
    expect(errors.some((e) => /DAL is not in the NFC North/.test(e))).toBe(true);
  });

  it("rejects an NFC team listed as an AFC wildcard", () => {
    const entry: PickEntry = { ...valid, afcWildcards: ["LAC", "CIN", "DAL"] };
    expect(validatePickEntry(entry)[0]).toMatch(/AFC wildcard DAL is not an AFC team/);
  });

  it("requires player names", () => {
    const entry: PickEntry = { ...valid, mvp: "  " };
    expect(validatePickEntry(entry)).toEqual(["Tester: MVP is missing."]);
  });
});

describe("validateParticipants", () => {
  it("flags duplicate names case-insensitively", () => {
    const errors = validateParticipants([valid, { ...valid, name: "tester" }]);
    expect(errors).toEqual(['Participant name "tester" appears 2 times.']);
  });
});
