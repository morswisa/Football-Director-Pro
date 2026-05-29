# Current Task

Implement Football Director Pro Full Core V1 as a web-first owner/chairman football club simulation.

## Status

- Full Core V1 vertical slice implemented as a Next.js web app.
- The app runs locally at `http://127.0.0.1:3000` while the dev server is active.
- Current Vercel preview deployment is available at `https://football-director-1pyz8autq-mor-swisas-projects.vercel.app`.
- Static export is enabled for Capacitor via `out/`.
- V1 scope remains local/offline only: no cloud save, no ads, no IAP, no real clubs, no manual scouting, no manual lineup/tactics.
- Current iteration implements a save-backed Continue-driven `GameEvent` queue. Dashboard `Continue` now opens the next required event, and unresolved decision events block progression.
- Legacy `activeProposal` proposal handling has been removed; manager-led proposals now enter the same save-backed `eventQueue/currentEvent` path as every other chairman decision.

## Implemented Milestone

Playable V1 includes:

- New club creation as the primary start action on the main menu.
- Local save/load with IndexedDB.
- Season dashboard with central `Continue` flow backed by `eventQueue` and `currentEvent`.
- Event card system for season intro, crowd report, transfer-window opening, transfer budget, financial report, contract offers/responses, incoming bids, sale confirmation, youth decisions, manager frustration/retirement hints, manager contract expiry, match preview, match result, and season summary.
- Season summary now appears before the next season intro after a season transition, with finish, record, goal difference, season award, balance, promotion/relegation/stay status, next division, cup summary, and trophies.
- Dashboard metric buttons are the primary navigation into League, Roster, Manager, Training, Youth, Finances, Stadium, and History; duplicate top/bottom navigation has been removed.
- Full league standings table for the user's division.
- League fixtures now use a true round-robin schedule, so every club in the user's division has one match per round and the Continue loop cannot stall on a no-user-fixture round.
- Simplified player positions to G/D/M/F with position badges.
- Roster defaults to position order and supports manual sorting by `Pos`, `Player`, or `Rate`.
- Roster rows use a fixed Pos/Player/Rate layout with sticky sort controls.
- Loaded saves are normalized so duplicate club names and same-club player names receive stable display disambiguation.
- Youth Academy and Training Ground are managed through dashboard modals instead of a separate Training page, with `+1` through `+5` level selection before confirming upgrades or downgrades.
- Facility and stadium screens show selected level changes, costs, upkeep/capacity effects, and bank-impact context before actions.
- Manager hiring/firing.
- Manager hiring/firing now uses contract economics: weekly wages, contract years, compensation previews, free-agent/contracted candidate status, and a manager-action lock after changes.
- Manager contracts now age across seasons, compensation drops as years remaining fall, short-term manager-action locks clear at season rollover, and expired manager contracts create a blocking Continue decision to extend the deal or let the manager leave. If the manager leaves, the engine itself blocks further queued season progression until a replacement is hired, then resumes the parked queue.
- Manager-led transfer proposals. Contract renewals use wage/year offers; paid purchases use fee + wage + years negotiation with possible club/player refusal.
- Manager-led proposal cadence is tuned for the Continue loop: transfer-window months can create active proposal weeks, while non-window contract/proposal checks happen only on periodic review weeks instead of every other week.
- Manager-led loans. Loan-in proposals use a loan fee plus weekly wage contribution, loan-out proposals reduce wage pressure and return players at season end, and loan fees appear in financial reports.
- Transfer and bid decisions now identify whether the player is an external target or current squad player, show source/bidding club context, and include manager-trust impact in response copy.
- Manager model now uses Training, Tactics, Transfers, Youth, Reputation, style, personality, wage, contract years, and status; `Man Management` and `Wage Discipline` are removed from V1.
- Match preview offers `See Match` for an instant result and `Play Match` for a fast live minute-by-minute playback with score, stats, events, and final whistle before continuing.
- Live match playback now advances one minute at a time and blocks background controls through a dedicated full-screen overlay.
- Player and manager wage recommendations are formula-driven by division, rating/reputation, age/role/potential, and personality where relevant.
- Long-run balancing now updates sponsorship, debt limit, stadium upkeep, board confidence, manager trust, and stadium condition across match and season progression.
- Promotion and relegation are both modeled in season transitions, with club reputation and confidence changes.
- Edge-case coverage now proves debt-limit game over, facility upgrade/downgrade economics, manager churn lock behavior, and relegation movement between divisions.
- Multi-season human-style playtest coverage now drives the game through the Continue queue for multiple seasons with realistic budget, contract, transfer, sale, youth, and facility decisions.
- Squad-depth safety fills AI/user clubs with generated depth players when long careers, loans, or retirements leave a club short.
- Financial reports include same-week transfer fees paid and received.
- Dashboard, Finances screen, and financial report modals now use the same latest financial snapshot source for period income, expenses, and profit/loss.
- Mandatory decision modals for event-queue decisions and missing-manager states; the season cannot continue until the user answers.
- Transfer budget choices are available at transfer-window start: Max, Generous, Normal, Cautious, Strict, and Zero. The selected budget applies only to the active transfer window and expires outside transfer-window weeks.
- Manager trust changes based on contract, budget, transfer, and sale decisions.
- Chairman decision cards now surface selected trust, morale, wage-bill, balance, and replacement impact for the main decision types where those values can change, so relationship/economy movement is visible before confirming.
- Match simulation.
- Domestic cup flow: seasonal Chairman's Cup state, scheduled knockout ties, draw events in the Continue loop, cup match previews/results, non-league cup results, prize money in financial reports, cup status on Dashboard, cup history, and a cup achievement.
- Event/entity cards and match events use deterministic generated SVG portrait faces for players and managers, built from a shared procedural face template.
- Finances, stadium, training, youth, history, achievements.
- History now surfaces current-season record context before season-end history exists.
- Capacitor config and mobile scripts.
- Settings covers the original local/offline V1 needs: manual save, export copy/download, validated import into Slot 1, reset local career with confirmation, sound toggle, and normal/large text size.
- Manager-led transfer and contract proposals no longer have a legacy side path; they are generated, displayed, resolved, and persisted through `GameEvent` records only.

## Next Steps

- Final web-V1 acceptance pass: play through several careers from a clean save and fix only issues that break the original planned loop or make existing planned systems unclear.
- Final-check remaining decision feedback during acceptance playtesting and close any specific choice that still changes trust/fan/finance without visible explanation.
- Continue final balance tuning against longer human-style careers, especially wages, manager compensation, facility upkeep, sponsorship, debt pressure, and transfer/loan frequency.
- Verify every planned V1 surface one last time on mobile: Dashboard Continue loop, Roster, League, Manager, Finances, Stadium, Training/Youth popups, History, Settings, match playback, and save/import/export.
- Keep Capacitor native platform generation deferred until the web V1 is accepted, then add iOS/Android with `npm run mobile:add:ios` and `npm run mobile:add:android`.
