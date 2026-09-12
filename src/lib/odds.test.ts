import { describe, expect, it } from "vitest";
import type { Market, Markets } from "@/lib/types";
import { conferenceTeams, DIVISIONS } from "@/config/league";
import {
  deriveMarkets,
  impliedProb,
  normalize,
  parseAmerican,
  reachSuperBowlProbs,
  wildcardProbs,
} from "@/lib/odds";

describe("parseAmerican", () => {
  it("parses signed strings and EVEN", () => {
    expect(parseAmerican("+450")).toBe(450);
    expect(parseAmerican("-120")).toBe(-120);
    expect(parseAmerican("EVEN")).toBe(100);
    expect(parseAmerican("100")).toBe(100);
  });
  it("rejects junk", () => {
    expect(parseAmerican("")).toBeNull();
    expect(parseAmerican("OFF")).toBeNull();
    expect(parseAmerican(undefined)).toBeNull();
  });
});

describe("impliedProb", () => {
  it("matches the textbook conversions", () => {
    expect(impliedProb("+100")).toBeCloseTo(0.5, 9);
    expect(impliedProb(-200)).toBeCloseTo(2 / 3, 9);
    expect(impliedProb("+400")).toBeCloseTo(0.2, 9);
    expect(impliedProb("-156")).toBeCloseTo(156 / 256, 9);
  });
});

describe("normalize", () => {
  it("sums to 1 within 1e-9", () => {
    const entrants = [
      { id: "a", label: "a", prob: impliedProb("-156") },
      { id: "b", label: "b", prob: impliedProb("+160") },
      { id: "c", label: "c", prob: impliedProb("+1300") },
      { id: "d", label: "d", prob: impliedProb("+3300") },
    ];
    const sum = normalize(entrants).reduce((a, e) => a + e.prob, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });
  it("scales to an arbitrary total", () => {
    const sum = normalize([{ prob: 1 }, { prob: 3 }], 7).reduce((a, e) => a + e.prob, 0);
    expect(sum).toBeCloseTo(7, 9);
  });
  it("handles an all-zero market", () => {
    expect(normalize([{ prob: 0 }, { prob: 0 }])).toEqual([{ prob: 0 }, { prob: 0 }]);
  });
});

describe("wildcardProbs", () => {
  const afc = conferenceTeams("AFC");
  const divProb: Record<string, number> = {};
  for (const div of Object.values(DIVISIONS.AFC)) {
    const raw = [0.6, 0.25, 0.1, 0.05];
    div.forEach((t, i) => (divProb[t] = raw[i]));
  }

  it("heuristic sums to 3 across a 16-team conference", () => {
    const wc = wildcardProbs(afc, divProb);
    const sum = Object.values(wc).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(3, 9);
    expect(Object.keys(wc)).toHaveLength(16);
  });

  it("heuristic weights p(1-p): coin-flip teams beat runaway favorites and longshots", () => {
    const wc = wildcardProbs(afc, divProb);
    expect(wc.MIA).toBeGreaterThan(wc.NYJ);
    const lopsided = wildcardProbs(["A", "B", "C"], { A: 0.9, B: 0.5, C: 0.05 });
    expect(lopsided.B).toBeGreaterThan(lopsided.A);
    expect(lopsided.A).toBeGreaterThan(lopsided.C);
  });

  it("uses P(playoffs) minus P(division) when a make-playoffs market exists", () => {
    const playoff: Record<string, number> = {};
    for (const t of afc) playoff[t] = Math.min(1, divProb[t] + 0.2);
    const wc = wildcardProbs(afc, divProb, playoff);
    expect(wc.BUF).toBeCloseTo(0.2, 9);
    expect(wc.NYJ).toBeCloseTo(0.2, 9);
  });
});

describe("reachSuperBowlProbs", () => {
  const sb: Market = {
    key: "sbWinner",
    displayName: "Super Bowl Winner",
    provider: "DraftKings",
    entrants: [
      { id: "2", label: "Buffalo Bills", abbreviation: "BUF", american: "+1000", prob: 0.6 },
      { id: "20", label: "New York Jets", abbreviation: "NYJ", american: "+50000", prob: 0.01 },
    ],
  };
  it("derives min(2p, cap) without a champion market", () => {
    const r = reachSuperBowlProbs(["BUF", "NYJ"], undefined, sb);
    expect(r.source).toBe("derived");
    expect(r.probs.BUF).toBeCloseTo(0.95, 9);
    expect(r.probs.NYJ).toBeCloseTo(0.02, 9);
  });
  it("uses the champion market when present", () => {
    const champ: Market = { ...sb, key: "afcChampion", entrants: [{ ...sb.entrants[0], prob: 0.3 }] };
    const r = reachSuperBowlProbs(["BUF", "NYJ"], champ, sb);
    expect(r.source).toBe("market");
    expect(r.probs.BUF).toBe(0.3);
    expect(r.probs.NYJ).toBe(0);
  });
});

describe("deriveMarkets", () => {
  it("adds wildcard markets and flags the model", () => {
    const markets: Markets = {};
    const { markets: out, model } = deriveMarkets(markets);
    expect(model).toEqual({ wildcard: "heuristic", superBowlTeam: "derived" });
    expect(out.afcWildcard?.entrants).toHaveLength(16);
    expect(out.nfcChampion?.provider).toBe("model");
  });
});
