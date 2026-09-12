---
title: Handoff prompt: NFL Tracker build
type: reference
created: 2026-09-12
updated: 2026-09-12
tags: [nfl, side-project, web-app, handoff, claude-code]
status: active
---

# Handoff prompt: NFL Tracker build

Companion to [[Projects/NFL-Tracker/prd|the PRD]]. Run this in Claude Code from `~/Documents/Projects/NFL-with-friends`, which currently holds only the repo `CLAUDE.md`. Each step ends with a validation gate; do not let Claude Code run ahead of a failed gate. Steps 1 and 2 need your own terminal or browser because ESPN's APIs are blocked from Cowork's sandbox and were never verified from there. Steps 3 through 10 are ordered so the site is deployable after step 7; steps 8 through 10 are polish and the optional backend.

Everything below the rule is the prompt. Paste it whole, then drive one step at a time.

---

# Handoff Prompt: NFL Tracker

Paste the content below into Claude Code when working in the `NFL-with-friends` repo.

## Context

This is a season-long NFL predictions game for a six-to-ten person friend group. Each participant submits one preseason entry (8 division winners, 6 wildcards, 2 Super Bowl teams, the Super Bowl winner, Super Bowl MVP, regular season MVP, and Offensive Rookie of the Year). The site shows everyone's picks side by side, live NFL standings with betting-implied division probabilities, award and Super Bowl futures, and a leaderboard ranked by forecasted points (points × probability of each pick being right, plus expected bonus and consolation value) that becomes an official score as results settle. Odds are displayed as American odds exactly as the sportsbook lists them; implied probability exists only inside the scoring engine.

It is a sibling of the MLB draft tracker at `~/Documents/Projects/MLB-with-friends` (Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Vercel, ESPN's public APIs). Copy that repo's conventions: picks and results are committed config files that self-validate at load, everything visual is a `"use client"` component, no auth, no database. Two deliberate departures: data comes through Next.js route handlers with Vercel data-cache revalidation instead of browser fetches (the futures feed needs a fan-out of athlete lookups that should be cached once, not per visitor, and the core ESPN host is not confirmed to send CORS headers), and a `/picks` page acts as a validating pick sheet that formats a participant's picks for pasting into config. A real submit form with a database was rejected for this season because picks lock on 2026-09-13 at 17:00 UTC.

## Current State

The repo directory exists and holds only `CLAUDE.md`. The reference implementation to imitate is `~/Documents/Projects/MLB-with-friends`: read its `CLAUDE.md`, `src/lib/espn.ts`, `src/config/rosters.ts`, `src/hooks/useStandings.ts`, and `src/components/` before writing anything. Reuse its `PARTICIPANT_COLORS`, its loading skeleton pattern, and its mobile fixes (viewport meta in `layout.tsx`, `overflow-x-auto` wrappers on every table).

## Implementation Steps

### Step 1: Confirm the ESPN feeds and record their shapes
**Do:** Before writing app code, fetch both feeds with curl and save the raw JSON under `docs/espn-samples/` (gitignored is fine, but keep them locally for the session):
`https://site.api.espn.com/apis/v2/sports/football/nfl/standings` and
`https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/futures?limit=200`.
From the standings sample, list the conference and division `name` values, the `team.id` and `team.abbreviation` for all 32 teams, and the exact `stats[].name` values (expected: wins, losses, ties, winPercent, streak, pointDifferential, playoffSeed, clincher). From the futures sample, list every item's `displayName` and, for one team market and one player market, the structure of `futures[0].books[0]` (provider name, `team.$ref` or `athlete.$ref`, `value`). Follow one athlete `$ref` and note the field that carries the display name. Write all of this into `docs/espn-shapes.md`.
**Why:** The whole app is joins against these shapes. Guessed field names are the most likely way this build stalls, and the market `displayName` strings must be matched exactly.
**Validate:** `docs/espn-shapes.md` exists, lists 32 teams with ids, names the two conference and eight division strings, and lists every futures `displayName`. If the futures feed lacks division-winner markets, stop and report; the PRD's fallback is to use the Super Bowl market only and mark Div odds as unavailable.

### Step 2: Scaffold the project
**Do:** `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` with the same major versions as the MLB repo's `package.json`. A `CLAUDE.md` already exists at the repo root (it points at the vault mirror and describes the intended structure); read it, do not overwrite it, and update it only when the built structure diverges from what it describes. Set the viewport meta and a dark `<html class="dark">` base in `src/app/layout.tsx`. Initialize git and make the first commit.
**Why:** Same stack as MLB means the deploy path and mental model are already known.
**Validate:** `npm run dev` serves the default page; `npm run lint` passes; `git log` shows one commit.

### Step 3: Season config and types
**Do:** Create `src/lib/types.ts` with `TeamRecord` (abbreviation, id, displayName, logoUrl, conference, division, wins, losses, ties, winPct, streak, pointDiff, playoffSeed, clincher), `PickEntry` (name, afcDivisions {East,North,South,West}, nfcDivisions, afcWildcards[3], nfcWildcards[3], superBowl {afc, nfc}, superBowlWinner, superBowlMvp, mvp, roy), `Market` (key, entrants: {id, label, abbreviation?, prob}[]), `Results`, and `ParticipantScore` (name, color, rank, forecasted, settled, maxPossible, picks: scored pick rows). Create `src/config/league.ts` exporting `SEASON = 2026`, `LOCK_AT = "2026-09-13T17:00:00Z"`, `POINTS = { division: 10, wildcard: 10, superBowlTeam: 30, superBowlWinner: 50, superBowlMvp: 30, mvp: 50, oroy: 30, divisionSweep: 20, playoffConsolation: 5 }` (max total 400), `DIVISIONS` (AFC East BUF MIA NE NYJ; AFC North BAL CIN CLE PIT; AFC South HOU IND JAX TEN; AFC West DEN KC LV LAC; NFC East DAL NYG PHI WSH; NFC North CHI DET GB MIN; NFC South ATL CAR NO TB; NFC West ARI LAR SF SEA, corrected against step 1's abbreviations), `PROVIDER_PREFERENCE = ["DraftKings", "FanDuel", "ESPN BET"]`, and a `MARKETS` map from logical keys (`sbWinner`, `afcChampion`, `nfcChampion`, `mvp`, `oroy`, `sbMvp`, `makePlayoffs`, and one per division) to the exact `displayName` strings found in step 1. Create `src/config/picks.ts` with a `participants: PickEntry[]` array holding two placeholder entries and a validator that runs at module load and `console.error`s on: a wildcard that duplicates the participant's own division winner in that conference, duplicate wildcards, a Super Bowl team not in that participant's seven playoff picks for its conference, a Super Bowl winner not among the two Super Bowl teams, and any abbreviation not in `DIVISIONS`. Create `src/config/results.ts` exporting an empty `Results` object with optional fields for every settleable category.
**Why:** Config-as-code is the MLB pattern; the validator is what makes hand-typed picks safe.
**Validate:** Write `src/config/picks.test.ts` (vitest, add it as a dev dependency) with one valid entry passing and four invalid entries each triggering the expected error; `npx vitest run` passes.

### Step 4: ESPN standings route
**Do:** Create `src/lib/espn/standings.ts` that fetches the standings URL with `next: { revalidate: 3600 }`, walks conference → division → entries, and returns `TeamRecord[]` using the stat names confirmed in step 1. Expose it at `src/app/api/standings/route.ts` returning `{ teams, fetchedAt }`. Build `TEAM_ID_TO_ABBR` from the same response and export it for the odds module.
**Why:** Standings drive the standings section, the elimination markers, and the team id map the odds feed needs.
**Validate:** `curl localhost:3000/api/standings | jq '.teams | length'` returns 32, and one AFC East team shows the correct division and a non-null `winPct`.

### Step 5: ESPN futures route and probability model
**Do:** Create `src/lib/espn/futures.ts`: fetch the futures URL with `next: { revalidate: 21600 }`, select for each configured market the first provider in `PROVIDER_PREFERENCE` that is present (else the first provider), parse American odds from `value` (`+450`, `-120`, handle `EVEN`), resolve `team.$ref` via `TEAM_ID_TO_ABBR` and `athlete.$ref` via a fetch of the ref cached in a module-level `Map` keyed by athlete id. Keep the raw American odds string on every entrant (`american: "+450"`) because the UI displays odds exactly as listed and never shows a percentage; implied probability is internal to the scoring engine. Create `src/lib/odds.ts` with pure functions: `impliedProb(american)`, `normalize(entrants)` (divide by the sum so a market totals 1), `wildcardProbs(conferenceTeams, divisionProbs, playoffProbs?)` implementing P(playoffs) − P(div) when a make-playoffs market exists, else the heuristic 3 × p(1−p) ÷ Σ p(1−p) over the conference, and `reachSuperBowlProbs` using the conference champion markets when present else min(2 × P(win SB), 0.95). Expose everything at `src/app/api/odds/route.ts` returning `{ markets, model: { wildcard: "market" | "heuristic", superBowlTeam: "market" | "derived" }, fetchedAt }`. Cap athlete resolution at the top 25 entrants per player market by implied probability.
**Why:** Vig-removed probabilities are the input to every forecasted number on the site; keeping the math in pure functions makes it testable and lets the wildcard fallback be swapped later.
**Validate:** `src/lib/odds.test.ts` covers `impliedProb` (+100 → 0.5, −200 → 0.667, +400 → 0.2), `normalize` summing to 1 within 1e-9, and the wildcard heuristic summing to 3 across a 16-team conference; `curl localhost:3000/api/odds | jq '.markets | keys'` lists every configured market key that exists in the feed, and each division market's probabilities sum to 1.

### Step 6: Scoring engine
**Do:** Create `src/lib/scoring.ts` with `scoreParticipants(picks, teams, markets, results): ParticipantScore[]`. For each of a participant's 20 picks, produce a row with category, pick, points, probability, and status (`open`, `correct`, `wrong`). Status comes first from `results.ts`, then from ESPN `clincher` values (a clinched division settles that division for everyone; a team marked eliminated settles any division or wildcard pick on it as wrong), else `open`. Probability is 1 or 0 when settled, otherwise the market value (award picks not listed in the market get 0.005). Add three derived rows per participant: an AFC sweep bonus and an NFC sweep bonus (20 points, probability = product of that conference's four division pick probabilities, settled correct only when all four are correct and wrong as soon as one is), and a playoff consolation row (5 points per qualifying team: a division pick whose team makes the playoffs as a wildcard, or a wildcard pick whose team wins its division; forecasted as 5 × P(team is wildcard) for division picks and 5 × P(team wins division) for wildcard picks; never paid alongside a correct pick on the same team). Forecasted = Σ points × probability over all rows including the derived ones; settled = Σ points over correct rows; maxPossible = settled + Σ points over rows still open, so a wrong division pick also removes that conference's sweep bonus from maxPossible. Rank by forecasted descending, shared ranks on ties, and flip the sort to settled once no rows remain open. Add `src/hooks/useGame.ts` that fetches `/api/standings` and `/api/odds`, runs the scorer, and returns `{ teams, markets, scores, model, lastUpdated, loading, error, refresh }`, mirroring `useStandings.ts` in the MLB repo.
**Why:** This is the game. Keeping it pure and separate from fetching means the leaderboard can be unit-tested against fixtures.
**Validate:** `src/lib/scoring.test.ts` with a fixture of two participants and hand-computed expected forecasted, settled, and max values, including one settled-correct, one settled-wrong via `results.ts`, one auto-settled via a clincher flag, one full AFC sweep paying 20, and one consolation case (division pick that settled as a wildcard) paying 5 and not 10. Assert a perfect entry scores exactly 400. `npx vitest run` passes.

### Step 7: Dashboard page
**Do:** Build `src/app/page.tsx` as a client page composing: `Header` (title, season, countdown to `LOCK_AT` before lock via a one-second interval, "Picks locked" plus last refresh after; link to `/picks` only before lock), `Leaderboard` (rank, name with color chip, forecasted, settled, max possible out of 400; "Final" label when all settled), `PicksGrid` (rows = categories in PRD order, columns = participants, cells = logo from `https://a.espncdn.com/i/teamlogos/nfl/500/{abbr lowercased}.png` plus abbreviation or player name, green/red/eliminated states, a consensus strip under each row counting shared picks, first column `sticky left-0` inside an `overflow-x-auto` wrapper), `Standings` (AFC and NFC, four divisions each, columns team, W-L-T, PCT, STRK, DIFF, DIV ODDS showing the raw American odds string, with participant chips beside picked teams and clinch/eliminated marks), and `Futures` (MVP, OROY, Super Bowl winner top ten by shortest odds, each row showing the American odds, with picker chips; Super Bowl MVP only when the market exists). Dark theme: near-black background, white type, one accent, participant colors for chips, Tailwind utilities only. Use the MLB `LoadingSkeleton` approach while data loads and a visible error state with a retry button.
**Why:** This is the deliverable; everything before it is plumbing.
**Validate:** Human check. Open `localhost:3000` at 390px width in devtools: countdown and leaderboard are above the fold, the picks grid scrolls horizontally with the category column pinned, no horizontal scroll on the page body, all 32 logos load. `npm run build` succeeds with no type errors.

### Step 8: Pick sheet page
**Do:** Build `src/app/picks/page.tsx`: name input plus dropdowns generated from `DIVISIONS` for each field in `PickEntry`. Dependent filtering: a conference's wildcard selects exclude that conference's chosen division winners and each other; Super Bowl selects offer only that participant's seven playoff teams per conference; Super Bowl winner offers only the two Super Bowl teams. Run the same validator as `picks.ts` (export it from a shared module) and show errors inline. When valid, render a "Copy my picks" button that copies a formatted TypeScript object literal matching `PickEntry`, show the literal in a `<pre>`, and below it a plain-text summary for group chats. After `LOCK_AT`, render a locked notice instead of the form. Add a `?debug=1` query flag that ignores the lock so you can keep using the sheet to type in late entries.
**Why:** This is the ingress path: friends validate their own picks and send you a paste-ready block, without a backend.
**Validate:** Human check. Fill the form with an invalid combination (a wildcard equal to a division winner) and confirm the error; fill a valid one, copy, paste into `picks.ts`, and confirm the validator logs nothing in the dev console.

### Step 9: Deploy
**Do:** Create the Vercel project `nfl-with-friends` from the GitHub repo, no environment variables needed. Confirm route handlers are deployed as serverless functions and that the data cache is serving `/api/odds` (second request should return the same `fetchedAt`). Update the repo `CLAUDE.md` with the production URL.
**Why:** Picks lock 2026-09-13 at 17:00 UTC; the site should be live before then so people can see the sheet.
**Validate:** Production URL loads on a phone; `/api/standings` and `/api/odds` return 200 in production.

### Step 10 (optional, next season): Neon-backed submit form
**Do:** Only if asked. Add a Neon Postgres database through the Vercel marketplace, a `picks` table keyed by lowercase name with a JSON column for the entry and a passcode hash, `POST /api/picks` that validates with the shared validator and rejects after `LOCK_AT`, `GET /api/picks` that the dashboard reads instead of `picks.ts`, and a submit button on `/picks`. Keep `picks.ts` as a fallback source when the table is empty.
**Why:** Turns the pick sheet into a real form once there is a longer submission window.
**Validate:** Submitting twice under the same name and passcode updates rather than duplicates; submitting after lock returns 403.

## Constraints

- No API keys, no paid services, no database this season (step 10 is explicitly optional and deferred).
- ESPN's APIs are undocumented; any parser must fail soft (log and render an "odds unavailable" state) rather than crash the page when a market or field is missing.
- Keep the two route handlers as the only server code. No server components fetching data; all rendering components are `"use client"` like the MLB app.
- No em dashes anywhere in UI copy or code comments.
- Do not touch the MLB repo except to read it.
- Record any architecture decision that departs from this prompt in the vault mirror at `/Users/jacobstein/Brain/Projects/NFL-Tracker/CLAUDE.md` and reference it in the commit message.

## Definition of Done

`nfl-with-friends` is live on Vercel. The dashboard shows a countdown that turns into "Picks locked" at 2026-09-13 17:00 UTC, a leaderboard ranked by forecasted points, a picks grid for every participant in `picks.ts`, AFC and NFC standings by division with a Div odds column (raw American odds) and participant chips, and MVP, OROY, and Super Bowl futures tables showing American odds. No percentage appears anywhere in the UI. The scoring engine pays 10/10/30/50/30/50/30 per category, 20 per conference division sweep, and 5 per playoff consolation, for a maximum of 400. `/picks` validates an entry and produces a paste-ready `PickEntry` literal. `npx vitest run`, `npm run lint`, and `npm run build` all pass. The repo `CLAUDE.md` and the vault mirror describe the stack, the two route handlers, and the probability model including which wildcard path is active.
