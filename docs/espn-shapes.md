# ESPN feed shapes

Recorded 2026-09-11 from live responses (handoff step 1). Raw samples live in
`docs/espn-samples/` (gitignored). ESPN's APIs are undocumented; treat every field
here as observed, not guaranteed.

## Standings

URL used by the app:

```
https://site.api.espn.com/apis/v2/sports/football/nfl/standings?level=3
```

Departure from the handoff: the bare URL (no `level`) returns only two conference
groups with 16 flat entries each and no division `children`. Adding `level=3` returns
the conference -> division -> entries tree the parser expects. Both were confirmed live.

### Tree

```
{ season: { year: 2026 }, children: Conference[2] }
Conference: { id, name, abbreviation, isConference: true, children: Division[4] }
Division:   { id, name, abbreviation, standings: { entries: Entry[4] } }
Entry:      { team: { id, abbreviation, displayName, location, name, shortDisplayName,
                      logos: [{ href, rel: ["full","default"] }, { href, rel: [..., "dark"] }] },
              stats: Stat[] }
Stat:       { name, type, value: number | null, displayValue: string, description? }
```

Conference `name` values: `American Football Conference` (abbr `AFC`, id 8) and
`National Football Conference` (abbr `NFC`, id 7).

Division `name` values: `AFC East` (id 4), `AFC North` (12), `AFC South` (13),
`AFC West` (6), `NFC East` (1), `NFC North` (10), `NFC South` (11), `NFC West` (3).
Division `abbreviation` is just `EAST` / `NORTH` / etc, so use `name`.

### Teams (32)

| id | abbr | displayName | division |
|---|---|---|---|
| 1 | ATL | Atlanta Falcons | NFC South |
| 2 | BUF | Buffalo Bills | AFC East |
| 3 | CHI | Chicago Bears | NFC North |
| 4 | CIN | Cincinnati Bengals | AFC North |
| 5 | CLE | Cleveland Browns | AFC North |
| 6 | DAL | Dallas Cowboys | NFC East |
| 7 | DEN | Denver Broncos | AFC West |
| 8 | DET | Detroit Lions | NFC North |
| 9 | GB | Green Bay Packers | NFC North |
| 10 | TEN | Tennessee Titans | AFC South |
| 11 | IND | Indianapolis Colts | AFC South |
| 12 | KC | Kansas City Chiefs | AFC West |
| 13 | LV | Las Vegas Raiders | AFC West |
| 14 | LAR | Los Angeles Rams | NFC West |
| 15 | MIA | Miami Dolphins | AFC East |
| 16 | MIN | Minnesota Vikings | NFC North |
| 17 | NE | New England Patriots | AFC East |
| 18 | NO | New Orleans Saints | NFC South |
| 19 | NYG | New York Giants | NFC East |
| 20 | NYJ | New York Jets | AFC East |
| 21 | PHI | Philadelphia Eagles | NFC East |
| 22 | ARI | Arizona Cardinals | NFC West |
| 23 | PIT | Pittsburgh Steelers | AFC North |
| 24 | LAC | Los Angeles Chargers | AFC West |
| 25 | SF | San Francisco 49ers | NFC West |
| 26 | SEA | Seattle Seahawks | NFC West |
| 27 | TB | Tampa Bay Buccaneers | NFC South |
| 28 | WSH | Washington Commanders | NFC East |
| 29 | CAR | Carolina Panthers | NFC South |
| 30 | JAX | Jacksonville Jaguars | AFC South |
| 33 | BAL | Baltimore Ravens | AFC North |
| 34 | HOU | Houston Texans | AFC South |

Note the gap: ids 31 and 32 are unused; BAL is 33 and HOU is 34. Logo URL pattern
`https://a.espncdn.com/i/teamlogos/nfl/500/{abbr lowercased}.png` matches
`team.logos[0].href` for every team.

### Stat names

Match on `stat.name` (the `type` field is the same string lowercased).

| name | value | displayValue | notes |
|---|---|---|---|
| wins | number | "0" | |
| losses | number | "0" | |
| ties | number | "0" | |
| winPercent | number | ".000" / ".824" | |
| streak | number | "-" preseason, "W3" / "L2" in season | use displayValue |
| pointDifferential | number | "0" / "+170" | use displayValue for the sign |
| pointsFor / pointsAgainst | number | | |
| playoffSeed | number | "0" preseason, "1".."16" in season | 0 means unseeded |
| gamesBehind | number | "-" | |
| differential | number | | duplicate of pointDifferential |
| divisionWins / divisionLosses / divisionTies / divisionRecord | | | |
| lockedDivRank | number | | |
| overall | null | "0-0" / "7-9-1" | record string incl. ties |
| Home / Road / vs. Div. / vs. Conf. | null | "0-0" | |
| clincher | 0 | see below | ABSENT until a team clinches or is eliminated |

`clincher` is only present on entries that have clinched or been eliminated. Observed
values from the 2025 final standings (`?level=3&season=2025`):

| displayValue | description |
|---|---|
| `z` | Clinched Division |
| `*` | Clinched Division and Bye |
| `y` | Clinched Wild Card |
| `e` | Eliminated from Playoff Contention |

The parser treats `z` and `*` as division clinched, `y` as wildcard clinched, `e` as
eliminated, and anything else (including absent) as open. There is no `x` (clinched
playoff berth, slot unknown) in the 2025 sample, but the parser should tolerate an
unknown code by treating it as open.

## Futures

URL:

```
https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/futures?limit=200
```

Response: `{ count: 20, pageIndex, pageSize, pageCount, items: Item[] }`.

```
Item:     { $ref, id, name, displayName, futures: Future[] }
Future:   { provider: { id: "100", name: "DraftKings", active: 1, priority: 1 }, books: Book[] }
Book:     { team?: { $ref }, athlete?: { $ref }, value: "+450" }
```

Every book has exactly one of `team` or `athlete`. Every `value` in the live sample
matches `^[+-][0-9]+$`; no `EVEN` was observed, but the parser handles it. Only one
provider (DraftKings) is present on every market, so `PROVIDER_PREFERENCE` is moot
this season but stays in config.

### Every displayName (2026, 20 items)

| id | displayName | books | used as |
|---|---|---|---|
| 1208 | Regular Season MVP | 101 | `mvp` |
| 1209 | Offensive Player of the Year | 108 | |
| 1210 | Defensive Player of the Year | 102 | |
| 1211 | Offensive Rookie of the Year | 41 | `oroy` |
| 1212 | Defensive Rookie of the Year | 50 | |
| 1213 | Coach of the Year | 12 | |
| 1214 | Comeback Player of the Year | 41 | |
| 1218 | Protector of the Year | 78 | |
| 1561 | Super Bowl Winner | 32 | `sbWinner` |
| 2737 | AFC South Division Winner | 4 | `afcSouth` |
| 2738 | AFC North Division Winner | 4 | `afcNorth` |
| 2739 | AFC West Division Winner | 4 | `afcWest` |
| 2740 | AFC East Division Winner | 4 | `afcEast` |
| 2757 | AFC Champion | 16 | `afcChampion` |
| 3904 | NFC Champion | 16 | `nfcChampion` |
| 3905 | NFC North Division Winner | 4 | `nfcNorth` |
| 3906 | NFC East Division Winner | 4 | `nfcEast` |
| 3907 | NFC West Division Winner | 4 | `nfcWest` |
| 3908 | NFC South Division Winner | 4 | `nfcSouth` |
| 208273 | NFL - Team To Win Most Games (reg. season) | 32 | |

Missing markets and their consequences:

- No **Super Bowl MVP** market. The `sbMvp` key is configured but resolves to nothing;
  the Futures section hides that table and the scorer gives the pick the floor probability.
- No **To Make the Playoffs** market. Wildcard probability uses the heuristic path
  (`model.wildcard = "heuristic"`).
- **AFC Champion** and **NFC Champion** exist, so Super Bowl team probability uses
  those markets (`model.superBowlTeam = "market"`).

### Team market book (AFC East Division Winner)

```json
{ "team": { "$ref": "http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/teams/2?lang=en&region=us" }, "value": "-156" }
```

The team id is the last path segment of `team.$ref` (`teams/2` -> BUF). Resolve through
`TEAM_ID_TO_ABBR` built from standings.

### Player market book (Regular Season MVP)

```json
{ "athlete": { "$ref": "http://sports.core.api.espn.com/v2/sports/football/leagues/nfl/seasons/2026/athletes/3918298?lang=en&region=us" }, "value": "+600" }
```

Following the athlete `$ref` returns an athlete object; the display name is
`displayName` (also `fullName`; `shortName` is "J. Allen"). Useful extras:
`position.abbreviation`, `team.$ref` (same teams path), `headshot.href`.

```json
{ "id": "3918298", "displayName": "Josh Allen", "fullName": "Josh Allen", "shortName": "J. Allen", "position": { "abbreviation": "QB" }, "team": { "$ref": ".../teams/2?lang=en&region=us" }, "headshot": { "href": "https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png" } }
```

The `$ref` uses `http://`; the fetch upgrades it to `https://`.
