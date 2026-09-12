import { describe, expect, it } from "vitest";
import type { Market, Markets, PickEntry, Results, TeamRecord } from "@/lib/types";
import { DIVISIONS } from "@/config/league";
import { nameKey, scoreParticipants } from "@/lib/scoring";

const A: PickEntry = {
  name: "A",
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

const B: PickEntry = {
  name: "B",
  afcDivisions: { East: "NE", North: "PIT", South: "JAX", West: "DEN" },
  nfcDivisions: { East: "WSH", North: "GB", South: "CAR", West: "SEA" },
  afcWildcards: ["BUF", "BAL", "NYJ"],
  nfcWildcards: ["PHI", "DET", "LAR"],
  superBowl: { afc: "DEN", nfc: "SEA" },
  superBowlWinner: "SEA",
  superBowlMvp: "Sam Darnold",
  mvp: "Patrick Mahomes",
  roy: "Cam Ward",
};

function teamMarket(key: Market["key"], probs: Record<string, number>, provider = "DraftKings"): Market {
  return {
    key,
    displayName: key,
    provider,
    entrants: Object.entries(probs).map(([abbr, prob]) => ({
      id: abbr,
      label: abbr,
      abbreviation: abbr,
      american: provider === "model" ? undefined : "+100",
      prob,
    })),
  };
}

function playerMarket(key: Market["key"], probs: Record<string, number>): Market {
  return {
    key,
    displayName: key,
    provider: "DraftKings",
    entrants: Object.entries(probs).map(([label, prob]) => ({ id: label, label, american: "+100", prob })),
  };
}

const markets: Markets = {
  afcEast: teamMarket("afcEast", { BUF: 0.5, MIA: 0.3, NE: 0.15, NYJ: 0.05 }),
  afcNorth: teamMarket("afcNorth", { BAL: 0.5, CIN: 0.25, PIT: 0.2, CLE: 0.05 }),
  afcSouth: teamMarket("afcSouth", { HOU: 0.5, JAX: 0.25, IND: 0.2, TEN: 0.05 }),
  afcWest: teamMarket("afcWest", { KC: 0.4, LAC: 0.3, DEN: 0.25, LV: 0.05 }),
  nfcEast: teamMarket("nfcEast", { PHI: 0.4, DAL: 0.25, WSH: 0.3, NYG: 0.05 }),
  nfcNorth: teamMarket("nfcNorth", { DET: 0.5, GB: 0.3, CHI: 0.15, MIN: 0.05 }),
  nfcSouth: teamMarket("nfcSouth", { TB: 0.3, NO: 0.3, CAR: 0.25, ATL: 0.15 }),
  nfcWest: teamMarket("nfcWest", { LAR: 0.35, SF: 0.35, SEA: 0.25, ARI: 0.05 }),
  afcWildcard: teamMarket(
    "afcWildcard",
    { BUF: 0.1, MIA: 0.25, NE: 0.3, NYJ: 0.05, BAL: 0.1, CIN: 0.3, PIT: 0.25, CLE: 0.05, HOU: 0.1, IND: 0.2, JAX: 0.05, TEN: 0.05, KC: 0.2, LAC: 0.4, DEN: 0.15, LV: 0.45 },
    "model",
  ),
  nfcWildcard: teamMarket(
    "nfcWildcard",
    { PHI: 0.2, DAL: 0.2, WSH: 0.2, NYG: 0.05, DET: 0.15, GB: 0.35, CHI: 0.05, MIN: 0.05, TB: 0.25, NO: 0.25, CAR: 0.2, ATL: 0.1, LAR: 0.3, SF: 0.3, SEA: 0.35, ARI: 0 },
    "model",
  ),
  afcChampion: teamMarket("afcChampion", { BUF: 0.25, DEN: 0.1, KC: 0.2 }),
  nfcChampion: teamMarket("nfcChampion", { PHI: 0.2, SEA: 0.1, DET: 0.2 }),
  sbWinner: teamMarket("sbWinner", { BUF: 0.12, SEA: 0.05, PHI: 0.1 }),
  mvp: playerMarket("mvp", { "Josh Allen": 0.2, "Patrick Mahomes": 0.1 }),
  oroy: playerMarket("oroy", { "Cam Ward": 0.3 }),
};

function team(abbr: string, clincher: TeamRecord["clincher"] = null): TeamRecord {
  let conference: TeamRecord["conference"] = "AFC";
  let division: TeamRecord["division"] = "East";
  for (const conf of ["AFC", "NFC"] as const) {
    for (const div of ["East", "North", "South", "West"] as const) {
      if (DIVISIONS[conf][div].includes(abbr)) {
        conference = conf;
        division = div;
      }
    }
  }
  return {
    abbreviation: abbr,
    id: abbr,
    displayName: abbr,
    logoUrl: "",
    conference,
    division,
    wins: 0,
    losses: 0,
    ties: 0,
    winPct: 0,
    streak: "-",
    pointDiff: 0,
    playoffSeed: 0,
    clincher,
  };
}

describe("scoreParticipants mid-season", () => {
  // BUF, BAL, HOU settled by results; KC clinched its division; NE clinched a wildcard;
  // NYJ eliminated. Everything else open at the fixture probabilities.
  const results: Results = { divisions: { afcEast: "BUF", afcNorth: "BAL", afcSouth: "HOU" } };
  const teams = [team("KC", "division"), team("NE", "wildcard"), team("NYJ", "eliminated"), team("BUF")];
  const [a, b] = scoreParticipants([A, B], teams, markets, results);

  it("ranks A above B by forecasted points", () => {
    expect(a.name).toBe("A");
    expect(a.rank).toBe(1);
    expect(b.rank).toBe(2);
    expect(a.final).toBe(false);
  });

  it("settles A's AFC picks correct via results and the clincher and pays the AFC sweep", () => {
    const afc = a.picks.filter((p) => ["afcEast", "afcNorth", "afcSouth", "afcWest"].includes(p.category));
    expect(afc.map((p) => p.status)).toEqual(["correct", "correct", "correct", "correct"]);
    expect(a.bonuses.find((r) => r.category === "afcSweep")).toMatchObject({ status: "correct", earned: 20 });
    expect(a.bonuses.find((r) => r.category === "nfcSweep")).toMatchObject({ status: "open", reachable: 20 });
  });

  it("matches the hand-computed totals for A", () => {
    expect(a.settled).toBe(60);
    expect(a.maxPossible).toBe(400);
    expect(a.forecasted).toBeCloseTo(132.97, 6);
  });

  it("settles B's wrong division pick via results and pays the consolation for NE as a wildcard", () => {
    const east = b.picks.find((p) => p.category === "afcEast");
    expect(east).toMatchObject({ pick: "NE", status: "wrong", earned: 0, reachable: 0 });
    const cons = b.bonuses.find((r) => r.category === "consolation");
    expect(cons?.pick).toBe("NE (WC), BUF (div), BAL (div)");
    expect(cons?.earned).toBe(15);
    expect(cons?.status).toBe("open");
  });

  it("marks B's eliminated wildcard pick wrong and the AFC sweep dead", () => {
    const nyj = b.picks.find((p) => p.pick === "NYJ");
    expect(nyj).toMatchObject({ status: "wrong", eliminated: true });
    expect(b.bonuses.find((r) => r.category === "afcSweep")).toMatchObject({ status: "wrong", reachable: 0 });
  });

  it("matches the hand-computed totals for B", () => {
    expect(b.settled).toBe(15);
    expect(b.maxPossible).toBe(340);
    expect(b.forecasted).toBeCloseTo(69.2625, 6);
  });

  it("gives unlisted award picks the floor probability", () => {
    const roy = a.picks.find((p) => p.category === "oroy");
    expect(roy?.probability).toBe(0.005);
    expect(roy?.american).toBeUndefined();
    const mvp = a.picks.find((p) => p.category === "mvp");
    expect(mvp?.probability).toBe(0.2);
    expect(mvp?.american).toBe("+100");
  });

  it("never shows model odds", () => {
    const wc = a.picks.find((p) => p.category === "afcWildcard");
    expect(wc?.american).toBeUndefined();
  });
});

describe("scoreParticipants final", () => {
  const results: Results = {
    divisions: { afcEast: "BUF", afcNorth: "BAL", afcSouth: "HOU", afcWest: "KC", nfcEast: "PHI", nfcNorth: "DET", nfcSouth: "TB", nfcWest: "LAR" },
    wildcards: { afc: ["LAC", "CIN", "PIT"], nfc: ["GB", "SF", "WSH"] },
    conferenceChampions: { afc: "BUF", nfc: "PHI" },
    superBowlWinner: "BUF",
    superBowlMvp: "josh allen",
    mvp: "Josh Allen",
    oroy: "Ashton Jeanty",
  };
  const [a, b] = scoreParticipants([B, A], [], {}, results);

  it("scores a perfect entry at exactly 400 and flips the sort to settled", () => {
    expect(a.name).toBe("A");
    expect(a).toMatchObject({ settled: 400, forecasted: 400, maxPossible: 400, final: true, rank: 1 });
  });

  it("pays only consolations to the entry that got every slot wrong", () => {
    // PIT, WSH, GB landed as wildcards; BUF, BAL, PHI, DET, LAR won their divisions: 8 x 5.
    expect(b.name).toBe("B");
    expect(b.final).toBe(true);
    expect(b.settled).toBe(40);
    expect(b.maxPossible).toBe(40);
    expect(b.picks.every((p) => p.status === "wrong")).toBe(true);
    expect(b.rank).toBe(2);
  });
});

describe("ranking", () => {
  it("shares ranks on ties", () => {
    const [x, y, z] = scoreParticipants([A, { ...A, name: "A2" }, B], [], markets, {});
    expect([x.rank, y.rank, z.rank]).toEqual([1, 1, 3]);
  });
});

describe("nameKey", () => {
  it("ignores case, punctuation, and spacing", () => {
    expect(nameKey("  Mike Washington Jr. ")).toBe(nameKey("mike washington jr"));
    expect(nameKey("Ja'Kobi Lane")).toBe("jakobi lane");
  });
});
