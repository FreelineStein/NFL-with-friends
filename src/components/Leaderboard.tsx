"use client";

import type { ModelFlags, ParticipantScore } from "@/lib/types";
import { MAX_POINTS } from "@/config/league";
import { formatPoints } from "@/lib/format";
import Chip from "./Chip";

interface LeaderboardProps {
  scores: ParticipantScore[];
  model: ModelFlags | null;
  oddsError: string | null;
}

export default function Leaderboard({ scores, model, oddsError }: LeaderboardProps) {
  const isFinal = scores.length > 0 && scores.every((s) => s.final);

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-lg font-semibold text-white">Leaderboard</h2>
        <span className="text-xs text-zinc-500">
          {isFinal ? "Final" : "Ranked by forecast"} · out of {MAX_POINTS}
        </span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900 text-zinc-400 text-left text-xs uppercase tracking-wide">
              <th className="px-2 sm:px-3 py-2.5 font-medium w-7">#</th>
              <th className="px-2 sm:px-3 py-2.5 font-medium">Name</th>
              <th className="px-2 sm:px-3 py-2.5 font-medium text-right">{isFinal ? "Final" : "Forecast"}</th>
              <th className="px-2 sm:px-3 py-2.5 font-medium text-right">Settled</th>
              <th className="px-2 sm:px-3 py-2.5 font-medium text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s) => (
              <tr key={s.name} className={`border-t border-zinc-800 ${s.rank === 1 ? "bg-amber-400/5" : ""}`}>
                <td className="px-2 sm:px-3 py-2.5 text-zinc-500 font-medium">{s.rank === 1 ? "🏆" : s.rank}</td>
                <td className="px-2 sm:px-3 py-2.5">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <Chip name={s.name} color={s.color} />
                    <span className="truncate max-w-[110px] sm:max-w-none">{s.name}</span>
                  </div>
                  <div className="mt-1.5 h-1 w-full max-w-[120px] rounded bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded"
                      style={{ width: `${Math.min(100, ((isFinal ? s.settled : s.forecasted) / MAX_POINTS) * 100)}%`, backgroundColor: s.color }}
                    />
                  </div>
                </td>
                <td className="px-2 sm:px-3 py-2.5 text-right font-bold text-white tabular-nums">
                  {isFinal ? s.settled : formatPoints(s.forecasted)}
                </td>
                <td className="px-2 sm:px-3 py-2.5 text-right text-zinc-300 tabular-nums">{s.settled}</td>
                <td className="px-2 sm:px-3 py-2.5 text-right text-zinc-500 tabular-nums">{s.maxPossible}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        {oddsError
          ? "Odds unavailable right now; forecast counts settled picks only."
          : model
            ? `Forecast multiplies each pick by its sportsbook chance. Wildcards are ${
                model.wildcard === "market" ? "from the make-playoffs market" : "modeled from division odds"
              }; Super Bowl teams are ${model.superBowlTeam === "market" ? "from the conference champion markets" : "derived from Super Bowl odds"}.`
            : ""}
      </p>
    </section>
  );
}
