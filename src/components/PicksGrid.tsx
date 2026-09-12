"use client";

import type { ParticipantScore, ScoredPick } from "@/lib/types";
import Chip from "./Chip";
import TeamLogo from "./TeamLogo";

interface PicksGridProps {
  scores: ParticipantScore[];
}

function cellClasses(pick: ScoredPick): string {
  if (pick.status === "correct") return "bg-emerald-500/15 ring-1 ring-emerald-500/50 text-emerald-200";
  if (pick.status === "wrong") return "bg-red-500/10 ring-1 ring-red-500/40 text-red-300";
  if (pick.eliminated) return "bg-zinc-900 text-zinc-500 line-through";
  return "bg-zinc-900 text-zinc-100";
}

function Cell({ pick }: { pick: ScoredPick }) {
  const dim = pick.eliminated && pick.status !== "correct";
  return (
    <div className={`rounded-md px-2 py-1.5 min-w-[96px] ${cellClasses(pick)}`}>
      <div className="flex items-center gap-1.5">
        {pick.kind === "team" && (
          <TeamLogo abbr={pick.pick} size={20} className={dim ? "grayscale opacity-50" : ""} />
        )}
        <span className="truncate text-sm font-medium">{pick.pick}</span>
      </div>
      {pick.american && pick.status === "open" && (
        <div className="text-[10px] text-zinc-500 font-mono tabular-nums mt-0.5 no-underline">{pick.american}</div>
      )}
    </div>
  );
}

function consensus(picks: ScoredPick[]): string {
  const counts = new Map<string, number>();
  for (const p of picks) counts.set(p.pick, (counts.get(p.pick) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([pick, n]) => (n > 1 ? `${pick} ×${n}` : pick))
    .join(" · ");
}

export default function PicksGrid({ scores }: PicksGridProps) {
  if (scores.length === 0) return null;
  const rowCount = scores[0].picks.length;
  const bonusCount = scores[0].bonuses.length;

  const rows: { label: string; picks: ScoredPick[]; bonus: boolean }[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({ label: scores[0].picks[i].label, picks: scores.map((s) => s.picks[i]), bonus: false });
  }
  for (let i = 0; i < bonusCount; i++) {
    rows.push({ label: scores[0].bonuses[i].label, picks: scores.map((s) => s.bonuses[i]), bonus: true });
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
        <h2 className="text-lg font-semibold text-white">Picks</h2>
        <span className="text-xs text-zinc-500">green settled right · red settled wrong · struck out eliminated</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="text-sm border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-zinc-900 px-3 py-2 text-left text-xs uppercase tracking-wide text-zinc-400 font-medium border-b border-zinc-800 min-w-[104px]">
                Category
              </th>
              {scores.map((s) => (
                <th key={s.name} className="bg-zinc-900 px-2 py-2 text-left border-b border-zinc-800">
                  <div className="flex items-center gap-1.5 font-semibold text-white whitespace-nowrap">
                    <Chip name={s.name} color={s.color} />
                    {s.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.label}-${i}`} className={row.bonus ? "opacity-80" : ""}>
                <td className="sticky left-0 z-10 bg-zinc-950 px-3 py-1.5 align-top border-b border-zinc-800/60">
                  <div className="text-xs font-semibold text-zinc-300 whitespace-nowrap pt-1.5">{row.label}</div>
                  <div className="text-[10px] text-zinc-600">{row.picks[0].points} pts</div>
                </td>
                {row.picks.map((pick, j) => (
                  <td key={j} className="px-1.5 py-1.5 align-top border-b border-zinc-800/60">
                    {row.bonus ? (
                      <div className={`rounded-md px-2 py-1.5 min-w-[96px] text-xs ${cellClasses(pick)}`}>
                        <span className="font-medium">
                          {pick.status === "correct" ? `+${pick.earned}` : pick.status === "wrong" ? "0" : "open"}
                        </span>
                        {pick.category === "consolation" && pick.pick !== "open" && pick.pick !== "none" && (
                          <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">{pick.pick}</div>
                        )}
                      </div>
                    ) : (
                      <>
                        <Cell pick={pick} />
                        {j === scores.length - 1 && null}
                      </>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 overflow-x-auto">
        <h3 className="text-xs uppercase tracking-wide text-zinc-500 font-medium mb-1.5">Consensus</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
          {rows
            .filter((r) => !r.bonus)
            .map((row, i) => (
              <div key={`${row.label}-${i}`} className="contents">
                <dt className="text-zinc-400 whitespace-nowrap">{row.label}</dt>
                <dd className="text-zinc-300 whitespace-nowrap">{consensus(row.picks)}</dd>
              </div>
            ))}
        </dl>
      </div>
    </section>
  );
}
