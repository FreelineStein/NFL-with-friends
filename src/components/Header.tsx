"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LOCK_AT, SEASON } from "@/config/league";
import { formatCountdown, relativeTime } from "@/lib/format";

interface HeaderProps {
  lastUpdated: Date | null;
  onRefresh: () => void;
  loading: boolean;
}

const lockTime = new Date(LOCK_AT).getTime();

export default function Header({ lastUpdated, onRefresh, loading }: HeaderProps) {
  // null until mounted so the server and first client render agree.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, []);

  const locked = now !== null && now >= lockTime;
  const remaining = now === null ? null : lockTime - now;

  return (
    <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Degens NFL <span className="text-amber-400">{SEASON}</span>
          </h1>
          <div className="text-xs sm:text-sm text-zinc-400 font-mono tabular-nums truncate">
            {now === null ? (
              <span>&nbsp;</span>
            ) : locked ? (
              <span>
                <span className="text-zinc-200 font-semibold">Picks locked</span>
                {lastUpdated && <span> · updated {relativeTime(lastUpdated, now)}</span>}
              </span>
            ) : (
              <span>
                Picks lock in <span className="text-amber-300 font-semibold">{formatCountdown(remaining ?? 0)}</span>
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {now !== null && !locked && (
            <Link
              href="/picks"
              className="px-3 py-1.5 rounded-lg bg-amber-400 text-zinc-950 text-sm font-semibold hover:bg-amber-300 transition-colors"
            >
              Pick sheet
            </Link>
          )}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-lg text-zinc-300 hover:bg-zinc-800 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <svg className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
