# Current Task

Implement Football Director Pro Full Core V1 as a web-first owner/chairman football club simulation.

## Status

- Full Core V1 vertical slice implemented as a Next.js web app.
- The app runs locally at `http://127.0.0.1:3000` while the dev server is active.
- Current Vercel preview deployment is available at `https://football-director-7h06b6gcm-mor-swisas-projects.vercel.app`.
- Static export is enabled for Capacitor via `out/`.
- V1 scope remains local/offline only: no cloud save, no ads, no IAP, no real clubs, no manual scouting, no manual lineup/tactics.
- Current iteration implements a save-backed Continue-driven `GameEvent` queue. Dashboard `Continue` now opens the next required event, and unresolved decision events block progression.

## Implemented Milestone

Playable V1 includes:

- New club creation as the primary start action on the main menu.
- Local save/load with IndexedDB.
- Season dashboard with central `Continue` flow backed by `eventQueue` and `currentEvent`.
- Event card system for season intro, crowd report, transfer-window opening, transfer budget, financial report, contract offers/responses, incoming bids, sale confirmation, youth decisions, manager frustration/retirement hints, match preview, match result, and season summary.
- Dashboard metric buttons are the primary navigation into League, Roster, Manager, Training, Youth, Finances, Stadium, and History; duplicate top/bottom navigation has been removed.
- Full league standings table for the user's division.
- Simplified player positions to G/D/M/F with position badges.
- Roster defaults to position order and supports manual sorting by `Pos`, `Player`, or `Rate`.
- Roster rows use a fixed Pos/Player/Rate layout with sticky sort controls.
- Loaded saves are normalized so duplicate club names and same-club player names receive stable display disambiguation.
- Youth Academy and Training Ground are managed through dashboard modals instead of a separate Training page, with `+1` through `+5` level selection before confirming upgrades or downgrades.
- Facility and stadium screens show selected level changes, costs, upkeep/capacity effects, and bank-impact context before actions.
- Manager hiring/firing.
- Manager hiring/firing now uses contract economics: weekly wages, contract years, compensation previews, free-agent/contracted candidate status, and a manager-action lock after changes.
- Manager-led transfer proposals. Contract renewals use wage/year offers; paid purchases use fee + wage + years negotiation with possible club/player refusal.
- Manager-led loans. Loan-in proposals use a loan fee plus weekly wage contribution, loan-out proposals reduce wage pressure and return players at season end, and loan fees appear in financial reports.
- Transfer and bid decisions now identify whether the player is an external target or current squad player, show source/bidding club context, and include manager-trust impact in response copy.
- Manager model now uses Training, Tactics, Transfers, Youth, Reputation, style, personality, wage, contract years, and status; `Man Management` and `Wage Discipline` are removed from V1.
- Match preview offers `See Match` for an instant result and `Play Match` for a fast live minute-by-minute playback with score, stats, events, and final whistle before continuing.
- Live match playback now advances one minute at a time and blocks background controls through a dedicated full-screen overlay.
- Player and manager wage recommendations are formula-driven by division, rating/reputation, age/role/potential, and personality where relevant.
- Financial reports include same-week transfer fees paid and received.
- Dashboard, Finances screen, and financial report modals now use the same latest financial snapshot source for period income, expenses, and profit/loss.
- Mandatory decision modals for event-queue decisions and missing-manager states; the season cannot continue until the user answers.
- Transfer budget choices are available at transfer-window start: Max, Generous, Normal, Cautious, Strict, and Zero.
- Manager trust changes based on contract, budget, transfer, and sale decisions.
- Match simulation.
- Domestic cup flow: seasonal Chairman's Cup state, scheduled knockout ties, draw events in the Continue loop, cup match previews/results, non-league cup results, prize money in financial reports, cup status on Dashboard, cup history, and a cup achievement.
- Event/entity cards and match events use deterministic generated SVG portrait faces for players and managers, built from a shared procedural face template.
- Finances, stadium, training, youth, history, achievements.
- History now surfaces current-season record context before season-end history exists.
- Capacitor config and mobile scripts.
- Settings covers the original local/offline V1 needs: manual save, export copy/download, validated import into Slot 1, reset local career with confirmation, sound toggle, and normal/large text size.

## Next Steps

- Continue closing remaining items from the original V1 plan only.
- Improve depth of planned V1 systems where still shallow: richer event frequency tuning, wider balance coverage, and season-end progression clarity.
- Replace or fully retire the legacy `activeProposal` compatibility path after event-queue coverage is complete.
- Expand tests around long-run simulation, bankruptcy/debt edge cases, facility economics, manager churn, and multi-season promotion/relegation.
- Continue tuning the newly implemented wage economy and manager compensation values against longer simulated careers.
- Add native platforms with `npm run mobile:add:ios` and `npm run mobile:add:android` when the web V1 is accepted.
