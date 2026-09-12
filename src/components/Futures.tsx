"use client";

import type { Market, Markets, ParticipantScore, PickCategory } from "@/lib/types";
import { nameKey } from "@/lib/scoring";
import Chip from "./Chip";
import TeamLogo from "./TeamLogo";

interface FuturesProps {
  markets: Markets;
  scores: ParticipantScore[];
  oddsError: string | null;
}

interface TableSpec {
  title: string;
  key: keyof Markets;
  categories: PickCategory[];
  /** Only render when the market exists. */
  optional?: boolean;
}

const TABLES: TableSpec[] = [
  { title: "Regular season MVP", key: "mvp", categories: ["mvp"] },
  { title: "Offensive Rookie of the Year", key: "oroy", categories: ["oroy"] },
  { title: "Super Bowl winner", key: "sbWinner", categories: ["superBowlWinner"] },
  { title: "Super Bowl MVP", key: "sbMvp", categories: ["superBowlMvp"], optional: true },
];

function FuturesTable({ spec, market, scores }: { spec: TableSpec; market: Market | undefined; scores: ParticipantScore[] }) {
  const listed = market?.entrants.slice(0, 10) ?? [];
  const isTeam = listed.some((e) => e.abbreviation);

  const pickersFor = (label: string, abbreviation?: string) =>
    scores.filter((s) =>
      s.picks.some(
        (p) => spec.categories.includes(p.category) && (abbreviation ? p.pick === abbreviation : nameKey(p.pick) === nameKey(label)),
      ),
    );

  // Picks nobody in the top ten covers still deserve a row so they are visible.
  const listedKeys = new Set(listed.map((e) => (e.abbreviation ? e.abbreviation : nameKey(e.label))));
  const extras = new Map<string, { label: string; abbreviation?: string; american?: string }>();
  for (const s of scores) {
    for (const p of s.picks) {
      if (!spec.categories.includes(p.category)) continue;
      const key = p.kind === "team" ? p.pick : nameKey(p.pick);
      if (listedKeys.has(key) || extras.has(key)) continue;
      extras.set(key, { label: p.pick, abbreviation: p.kind === "team" ? p.pick : undefined, american: p.american });
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
            <th className="px-3 py-2 text-left font-medium">{spec.title}</th>
            <th className="px-2 py-2 text-right font-medium">Odds</th>
            <th className="px-2 py-2 text-left font-medium">Picked by</th>
          </tr>
        </thead>
        <tbody>
          {listed.length === 0 && extras.size === 0 && (
            <tr>
              <td colSpan={3} className="px-3 py-3 text-zinc-500 text-xs">
                Odds unavailable
              </td>
            </tr>
          )}
          {[...listed, ...extras.values()].map((e) => {
            const who = pickersFor(e.label, e.abbreviation);
            return (
              <tr key={e.abbreviation ?? e.label} className="border-t border-zinc-800/70">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {isTeam && e.abbreviation && <TeamLogo abbr={e.abbreviation} size={20} />}
                    <span className="text-white truncate">{e.label}</span>
                  </div>
                </td>
                <td className="px-2 py-2 text-right font-mono tabular-nums text-amber-200/90 whitespace-nowrap">
                  {e.american ?? <span className="text-zinc-600">unlisted</span>}
                </td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-0.5 flex-wrap">
                    {who.map((s) => (
                      <Chip key={s.name} name={s.name} color={s.color} />
                    ))}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function Futures({ markets, scores, oddsError }: FuturesProps) {
  const tables = TABLES.filter((t) => !t.optional || markets[t.key]);
  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Futures</h2>
        <span className="text-xs text-zinc-500">
          {oddsError ? "Odds unavailable" : `Top ten by odds · ${markets.sbWinner?.provider ?? markets.mvp?.provider ?? ""}`}
        </span>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((t) => (
          <FuturesTable key={t.key} spec={t} market={markets[t.key]} scores={scores} />
        ))}
      </div>
    </section>
  );
}
