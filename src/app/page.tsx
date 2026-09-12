"use client";

import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import PicksGrid from "@/components/PicksGrid";
import Standings from "@/components/Standings";
import Futures from "@/components/Futures";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useGame } from "@/hooks/useGame";

export default function Home() {
  const { teams, markets, model, scores, loading, error, oddsError, lastUpdated, refresh } = useGame();

  return (
    <>
      <Header lastUpdated={lastUpdated} onRefresh={refresh} loading={loading} />
      <main className="max-w-6xl mx-auto w-full px-4 py-6 space-y-10">
        {error && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-6 text-center">
            <p className="text-red-200 font-medium mb-1">Could not load standings</p>
            <p className="text-red-300/80 text-sm mb-4">{error}</p>
            <button
              onClick={refresh}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-400 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !error && <LoadingSkeleton />}

        {!loading && !error && (
          <>
            {oddsError && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                Odds unavailable ({oddsError}). Showing standings and settled picks only.
              </div>
            )}
            <Leaderboard scores={scores} model={model} oddsError={oddsError} />
            <PicksGrid scores={scores} />
            <Standings teams={teams} markets={markets} scores={scores} />
            <Futures markets={markets} scores={scores} oddsError={oddsError} />
          </>
        )}
      </main>
      <footer className="max-w-6xl mx-auto w-full px-4 py-6 text-xs text-zinc-600">
        Standings and odds from ESPN. Odds shown exactly as the sportsbook lists them.
      </footer>
    </>
  );
}
