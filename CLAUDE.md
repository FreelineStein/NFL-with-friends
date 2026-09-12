# NFL Tracker: repo notes

This repo is mirrored in Jacob's Obsidian vault. The vault is the source of truth for
thinking and architecture decisions; this file is the repo-local delta. Keep it lean.

- Vault mirror: `/Users/jacobstein/Brain/Projects/NFL-Tracker/CLAUDE.md`
- Spec: `/Users/jacobstein/Brain/Projects/NFL-Tracker/prd.md`
- Build plan: `/Users/jacobstein/Brain/Projects/NFL-Tracker/handoff-nfl-tracker.md`
- Record new architecture decisions in the mirror and reference them from commits.
- Sibling repo and reference implementation: `/Users/jacobstein/Documents/Projects/MLB-with-friends`

## Stack

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4. Deployed on Vercel
(project `nfl-with-friends`). No database, no auth. Two route handlers proxy ESPN's
public APIs with Vercel data-cache revalidation; everything visual is client-rendered.

## Structure

- `src/app/page.tsx`: dashboard, client component, wires `useGame()` into
  `Header` / `Leaderboard` / `PicksGrid` / `Standings` / `Futures`.
- `src/app/picks/page.tsx`: pick sheet. Validates an entry client-side and formats a
  paste-ready `PickEntry` literal. No submission, no storage. Locked after `LOCK_AT`;
  `?debug=1` bypasses the lock.
- `src/app/api/standings/route.ts`: ESPN standings
  (`site.api.espn.com/apis/v2/sports/football/nfl/standings`), revalidate 1h.
- `src/app/api/odds/route.ts`: ESPN futures
  (`sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/futures`),
  revalidate 6h, athlete `$ref`s resolved and cached in-module.
- `src/hooks/useGame.ts`: fetches both routes, runs the scorer, exposes teams, markets,
  scores, model flags, lastUpdated, loading, error, refresh.
- `src/lib/espn/`: `standings.ts`, `futures.ts` (parsers only; fail soft on missing fields).
- `src/lib/odds.ts`: pure odds math (American to implied, per-market normalization,
  wildcard and Super Bowl team derivations). Internal to scoring; UI shows raw American odds.
- `src/lib/scoring.ts`: pure scorer. Points, sweep bonuses, playoff consolation, settlement
  from `results.ts` then ESPN clincher flags. Max 400.
- `src/lib/types.ts`: `TeamRecord`, `PickEntry`, `Market`, `Results`, `ParticipantScore`.
- `src/config/league.ts`: season, `LOCK_AT`, `POINTS`, `DIVISIONS`, `PROVIDER_PREFERENCE`,
  `MARKETS` (exact ESPN futures `displayName` strings).
- `src/config/picks.ts`: hardcoded participant entries, validated at module load with
  `console.error` on an invalid combination.
- `src/config/results.ts`: hand-entered settled outcomes; overrides inferred settlement.
- `src/components/`: `Header`, `Leaderboard`, `PicksGrid`, `Standings`, `Futures`,
  `LoadingSkeleton`.
- `docs/espn-shapes.md`: recorded shapes of both ESPN feeds from the first build step.

## Local dev

- `npm run dev` / `npm run build` / `npm run start` / `npm run lint` / `npx vitest run`.

## Conventions

- All rendering components are `"use client"`. The two route handlers are the only server code.
- Picks live only in `src/config/picks.ts`; results only in `src/config/results.ts`. Update
  there, commit, deploy.
- ESPN is undocumented. Parsers log and render an unavailable state; they never throw
  into the page.
- Odds display as American odds exactly as listed. Never show a percentage.
- No em dashes in UI copy, comments, or docs.
