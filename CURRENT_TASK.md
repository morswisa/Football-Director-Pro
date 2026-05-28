# Current Task

Implement Football Director Pro Full Core V1 as a web-first owner/chairman football club simulation.

## Status

- Full Core V1 vertical slice implemented as a Next.js web app.
- The app runs locally at `http://127.0.0.1:3000` while the dev server is active.
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
- Youth Academy and Training Ground are managed through dashboard modals instead of a separate Training page, with `+1` through `+5` level selection before confirming upgrades or downgrades.
- Manager hiring/firing.
- Manager-led transfer proposals. Contract renewals use wage/year offers; paid purchases use fee + wage + years negotiation with possible club/player refusal.
- Financial reports include same-week transfer fees paid and received.
- Mandatory decision modals for event-queue decisions and missing-manager states; the season cannot continue until the user answers.
- Transfer budget choices are available at transfer-window start: Max, Generous, Normal, Cautious, Strict, and Zero.
- Manager trust changes based on contract, budget, transfer, and sale decisions.
- Match simulation.
- Event/entity cards and match events use deterministic generated SVG portrait faces for players and managers, built from a shared procedural face template.
- Finances, stadium, training, youth, history, achievements.
- Capacitor config and mobile scripts.

## Next Steps

- Continue closing remaining items from the original V1 plan only.
- Improve depth of planned V1 systems where still shallow: cup competition, loans, import UI, richer event frequency tuning, and wider balance coverage.
- Add native platforms with `npm run mobile:add:ios` and `npm run mobile:add:android` when the web V1 is accepted.
