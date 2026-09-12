"use client";

import type { Conference, Markets, ParticipantScore, TeamRecord } from "@/lib/types";
import { CONFERENCES, DIVISION_NAMES, divisionKey } from "@/config/league";
import { formatDiff, formatPct, formatRecord } from "@/lib/format";
import Chip from "./Chip";
import TeamLogo from "./TeamLogo";

interface StandingsProps {
  teams: TeamRecord[];
  markets: Markets;
  scores: ParticipantScore[];
}

interface Picker {
  name: string;
  color: string;
  asDivision: boolean;
}

function pickersByTeam(scores: ParticipantScore[]): Map<string, Picker[]> {
  const map = new Map<string, Picker[]>();
  for (const s of scores) {
    for (const p of s.picks) {
      if (p.kind !== "team") continue;
      const isDiv = /^(afc|nfc)(East|North|South|West)$/.test(p.category);
      const isWc = p.category === "afcWildcard" || p.category === "nfcWildcard";
      if (!isDiv && !isWc) continue;
      const list = map.get(p.pick) ?? [];
      if (!list.some((x) => x.name === s.name)) list.push({ name: s.name, color: s.color, asDivision: isDiv });
      map.set(p.pick, list);
    }
  }
  return map;
}

function clinchMark(t: TeamRecord): { text: string; title: string } | null {
  switch (t.clincher) {
    case "division":
      return { text: "z", title: "Clinched division" };
    case "wildcard":
      return { text: "y", title: "Clinched wild card" };
    case "playoffs":
      return { text: "x", title: "Clinched playoff berth" };
    case "eliminated":
      return { text: "e", title: "Eliminated from playoff contention" };
    default:
      return null;
  }
}

function DivisionTable({
  conf,
  div,
  teams,
  markets,
  pickers,
}: {
  conf: Conference;
  div: (typeof DIVISION_NAMES)[number];
  teams: TeamRecord[];
  markets: Markets;
  pickers: Map<string, Picker[]>;
}) {
  const market = markets[divisionKey(conf, div)];
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
            <th className="px-3 py-2 text-left font-medium">
              {conf} {div}
            </th>
            <th className="px-2 py-2 text-right font-medium">W-L</th>
            <th className="px-2 py-2 text-right font-medium hidden sm:table-cell">PCT</th>
            <th className="px-2 py-2 text-right font-medium">STRK</th>
            <th className="px-2 py-2 text-right font-medium">DIFF</th>
            <th className="px-2 py-2 text-right font-medium whitespace-nowrap">Div odds</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => {
            const mark = clinchMark(t);
            const odds = market?.entrants.find((e) => e.abbreviation === t.abbreviation)?.american;
            const who = pickers.get(t.abbreviation) ?? [];
            const dim = t.clincher === "eliminated";
            return (
              <tr key={t.abbreviation} className={`border-t border-zinc-800/70 ${dim ? "opacity-50" : ""}`}>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <TeamLogo abbr={t.abbreviation} size={22} className={dim ? "grayscale" : ""} />
                    <span className="font-medium text-white whitespace-nowrap">{t.abbreviation}</span>
                    {mark && (
                      <span
                        title={mark.title}
                        className={`text-[10px] font-bold px-1 rounded ${
                          mark.text === "e" ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300"
                        }`}
                      >
                        {mark.text}
                      </span>
                    )}
                    {who.length > 0 && (
                      <span className="flex items-center gap-0.5 ml-1">
                        {who.map((p) => (
                          <Chip
                            key={p.name}
                            name={p.name}
                            color={p.color}
                            variant={p.asDivision ? "solid" : "outline"}
                            title={`${p.name}: ${p.asDivision ? "division winner" : "wildcard"}`}
                          />
                        ))}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-right tabular-nums text-zinc-200 whitespace-nowrap">{formatRecord(t)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-zinc-400 hidden sm:table-cell">{formatPct(t.winPct)}</td>
                <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{t.streak}</td>
                <td className="px-2 py-2 text-right tabular-nums text-zinc-400">{formatDiff(t.pointDiff)}</td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-amber-200/90 whitespace-nowrap">
                  {odds ?? <span className="text-zinc-600">n/a</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Standings({ teams, markets, scores }: StandingsProps) {
  const pickers = pickersByTeam(scores);
  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
        <h2 className="text-lg font-semibold text-white">Standings</h2>
        <span className="text-xs text-zinc-500">solid chip picked to win division · outlined chip picked as wildcard</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {CONFERENCES.map((conf) => (
          <div key={conf} className="space-y-3">
            <h3 className="text-sm font-bold text-amber-400 tracking-wide">{conf}</h3>
            {DIVISION_NAMES.map((div) => (
              <DivisionTable
                key={div}
                conf={conf}
                div={div}
                teams={teams.filter((t) => t.conference === conf && t.division === div)}
                markets={markets}
                pickers={pickers}
              />
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
