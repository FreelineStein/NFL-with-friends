"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { Conference, DivisionName, PickEntry } from "@/lib/types";
import { CONFERENCES, DIVISIONS, DIVISION_NAMES, LOCK_AT, SEASON, TEAM_NAMES, conferenceTeams } from "@/config/league";
import { playoffPicks, validatePickEntry } from "@/lib/validatePicks";
import { toLiteral, toSummary } from "@/lib/formatPicks";

const EMPTY: PickEntry = {
  name: "",
  afcDivisions: { East: "", North: "", South: "", West: "" },
  nfcDivisions: { East: "", North: "", South: "", West: "" },
  afcWildcards: ["", "", ""],
  nfcWildcards: ["", "", ""],
  superBowl: { afc: "", nfc: "" },
  superBowlWinner: "",
  superBowlMvp: "",
  mvp: "",
  roy: "",
};

const lockTime = new Date(LOCK_AT).getTime();
const lockLabel = new Date(LOCK_AT).toLocaleString("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/** Wall clock captured after mount, so the server and first client render agree. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setNow(Date.now()), 0);
    return () => clearTimeout(t);
  }, []);
  return now;
}

function divField(conf: Conference): "afcDivisions" | "nfcDivisions" {
  return conf === "AFC" ? "afcDivisions" : "nfcDivisions";
}
function wcField(conf: Conference): "afcWildcards" | "nfcWildcards" {
  return conf === "AFC" ? "afcWildcards" : "nfcWildcards";
}
function sbField(conf: Conference): "afc" | "nfc" {
  return conf === "AFC" ? "afc" : "nfc";
}

/** Clears downstream picks that a change made invalid, so dependent dropdowns stay consistent. */
function reconcile(entry: PickEntry): PickEntry {
  const next: PickEntry = {
    ...entry,
    afcDivisions: { ...entry.afcDivisions },
    nfcDivisions: { ...entry.nfcDivisions },
    afcWildcards: [...entry.afcWildcards] as PickEntry["afcWildcards"],
    nfcWildcards: [...entry.nfcWildcards] as PickEntry["nfcWildcards"],
    superBowl: { ...entry.superBowl },
  };
  for (const conf of CONFERENCES) {
    const winners = DIVISION_NAMES.map((d) => next[divField(conf)][d]);
    const wcs = next[wcField(conf)];
    wcs.forEach((abbr, i) => {
      if (abbr && (winners.includes(abbr) || wcs.indexOf(abbr) !== i)) wcs[i] = "";
    });
    const sb = next.superBowl[sbField(conf)];
    if (sb && !playoffPicks(next, conf).includes(sb)) next.superBowl[sbField(conf)] = "";
  }
  if (next.superBowlWinner && ![next.superBowl.afc, next.superBowl.nfc].includes(next.superBowlWinner)) {
    next.superBowlWinner = "";
  }
  return next;
}

const selectClass =
  "w-full rounded-lg bg-zinc-900 border border-zinc-700 px-2.5 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-400";
const labelClass = "block text-xs uppercase tracking-wide text-zinc-500 mb-1";

function TeamSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select</option>
        {options.map((abbr) => (
          <option key={abbr} value={abbr}>
            {abbr} · {TEAM_NAMES[abbr] ?? abbr}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        type="text"
        className={selectClass}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function PickSheet() {
  const [entry, setEntry] = useState<PickEntry>(EMPTY);
  const [copied, setCopied] = useState<"literal" | "summary" | null>(null);

  const update = (fn: (draft: PickEntry) => PickEntry) => {
    setCopied(null);
    setEntry((prev) => reconcile(fn(prev)));
  };

  const errors = useMemo(() => validatePickEntry(entry), [entry]);
  const missing = errors.filter((e) => / is missing\.$| is required\.$|needs exactly 3/.test(e));
  const problems = errors.filter((e) => !missing.includes(e));
  const valid = errors.length === 0;
  const literal = valid ? toLiteral(entry) : "";
  const summary = valid ? toSummary(entry) : "";

  const copy = async (kind: "literal" | "summary") => {
    try {
      await navigator.clipboard.writeText(kind === "literal" ? literal : summary);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <label className="block max-w-sm">
          <span className={labelClass}>Your name</span>
          <input
            type="text"
            className={selectClass}
            value={entry.name}
            placeholder="As it should appear on the leaderboard"
            autoComplete="off"
            onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
          />
        </label>
      </div>

      {CONFERENCES.map((conf) => {
        const winners = DIVISION_NAMES.map((d) => entry[divField(conf)][d]).filter(Boolean);
        const wcs = entry[wcField(conf)];
        const wcOptions = (slot: number) =>
          conferenceTeams(conf).filter((t) => !winners.includes(t) && !wcs.some((w, i) => i !== slot && w === t));
        return (
          <section key={conf} className="space-y-4">
            <h2 className="text-sm font-bold text-amber-400 tracking-wide">{conf}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {DIVISION_NAMES.map((div: DivisionName) => (
                <TeamSelect
                  key={div}
                  label={`${conf} ${div} winner`}
                  value={entry[divField(conf)][div]}
                  options={DIVISIONS[conf][div]}
                  onChange={(v) =>
                    update((d) => ({ ...d, [divField(conf)]: { ...d[divField(conf)], [div]: v } }))
                  }
                />
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((slot) => (
                <TeamSelect
                  key={slot}
                  label={`${conf} wildcard ${slot + 1}`}
                  value={wcs[slot]}
                  options={wcOptions(slot)}
                  onChange={(v) =>
                    update((d) => {
                      const next = [...d[wcField(conf)]] as PickEntry["afcWildcards"];
                      next[slot] = v;
                      return { ...d, [wcField(conf)]: next };
                    })
                  }
                />
              ))}
            </div>
          </section>
        );
      })}

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-amber-400 tracking-wide">Super Bowl</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {CONFERENCES.map((conf) => (
            <TeamSelect
              key={conf}
              label={`${conf} champion`}
              value={entry.superBowl[sbField(conf)]}
              options={playoffPicks(entry, conf)}
              onChange={(v) => update((d) => ({ ...d, superBowl: { ...d.superBowl, [sbField(conf)]: v } }))}
            />
          ))}
          <TeamSelect
            label="Super Bowl winner"
            value={entry.superBowlWinner}
            options={[entry.superBowl.afc, entry.superBowl.nfc].filter(Boolean)}
            onChange={(v) => update((d) => ({ ...d, superBowlWinner: v }))}
          />
        </div>
        <p className="text-xs text-zinc-500">
          Super Bowl teams come from your seven playoff picks per conference; pick those first.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-amber-400 tracking-wide">Awards</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <TextInput
            label="Super Bowl MVP"
            value={entry.superBowlMvp}
            placeholder="Player name"
            onChange={(v) => update((d) => ({ ...d, superBowlMvp: v }))}
          />
          <TextInput label="Regular season MVP" value={entry.mvp} placeholder="Player name" onChange={(v) => update((d) => ({ ...d, mvp: v }))} />
          <TextInput
            label="Offensive Rookie of the Year"
            value={entry.roy}
            placeholder="Player name"
            onChange={(v) => update((d) => ({ ...d, roy: v }))}
          />
        </div>
        <p className="text-xs text-zinc-500">Spell player names the way ESPN does so the odds match up.</p>
      </section>

      {problems.length > 0 && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <ul className="list-disc pl-5 space-y-1">
            {problems.map((e) => (
              <li key={e}>{e.replace(/^[^:]+: /, "")}</li>
            ))}
          </ul>
        </div>
      )}

      {!valid && problems.length === 0 && (
        <p className="text-sm text-zinc-500">
          {missing.length} field{missing.length === 1 ? "" : "s"} still to fill in.
        </p>
      )}

      {valid && (
        <section className="space-y-4">
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            Looks good. Copy the block below and send it to Jacob; it goes straight into the config.
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => copy("literal")}
              className="px-4 py-2 rounded-lg bg-amber-400 text-zinc-950 text-sm font-semibold hover:bg-amber-300 transition-colors"
            >
              {copied === "literal" ? "Copied" : "Copy my picks"}
            </button>
            <button
              onClick={() => copy("summary")}
              className="px-4 py-2 rounded-lg border border-zinc-700 text-zinc-200 text-sm font-medium hover:bg-zinc-800 transition-colors"
            >
              {copied === "summary" ? "Copied" : "Copy chat summary"}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-200 font-mono">
            {literal}
          </pre>
          <pre className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-xs text-zinc-300 whitespace-pre-wrap">
            {summary}
          </pre>
        </section>
      )}
    </div>
  );
}

function PicksPageBody() {
  const searchParams = useSearchParams();
  const debug = searchParams.get("debug") === "1";
  const now = useNow();
  if (now === null) return null;
  const locked = !debug && now >= lockTime;

  if (locked) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-8 text-center">
        <p className="text-lg font-semibold text-white mb-1">Picks are locked</p>
        <p className="text-sm text-zinc-400">The window closed {lockLabel}. Head back to the dashboard to follow the season.</p>
      </div>
    );
  }

  return (
    <>
      {debug && (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          Debug mode: the lock is bypassed.
        </div>
      )}
      <PickSheet />
    </>
  );
}

export default function PicksPage() {
  return (
    <>
      <header className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Pick sheet <span className="text-amber-400">{SEASON}</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400">Picks lock {lockLabel}</p>
          </div>
          <Link href="/" className="text-sm text-zinc-300 hover:text-white whitespace-nowrap">
            Dashboard
          </Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto w-full px-4 py-6">
        <Suspense fallback={null}>
          <PicksPageBody />
        </Suspense>
      </main>
    </>
  );
}
