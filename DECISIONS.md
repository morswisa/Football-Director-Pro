# Decisions

## Product

- The game is an owner/chairman simulation, not a tactics-heavy football manager.
- The player cannot manually scout/search players in V1.
- Transfers are manager-led proposals. The chairman can approve or reject them.
- Paid purchase proposals are negotiations, not one-click approvals: the chairman offers a club fee and player contract terms, then the selling club and player can accept or refuse.
- Same-week transfer fees must appear in financial report snapshots.
- Required chairman decisions must appear as blocking modal dialogs.
- The season cannot continue while a required decision is unresolved.
- Dashboard Continue is the primary gameplay loop; secondary pages are for inspection and focused management.
- Continue events are persisted in the save file through `eventQueue` and `currentEvent`, not held only in React component state.
- A resolved event immediately advances to the next queued event; only when the queue is empty does the next Continue generate the next period's events.
- Buy/sell transfer proposals are gated to transfer-window months; contract-renewal proposals may occur outside transfer windows.
- Transfer-window starts require a budget choice before the manager can operate with a clear budget.
- Manager trust is a club-level relationship metric affected by chairman decisions.
- Player positions are simplified to G, D, M, and F.
- Roster display defaults to position order G -> D -> M -> F, with manual sorting by position, player name, or rating.
- Roster and standings must prioritize trust: duplicate generated names are disambiguated on load, and roster rows use a fixed three-column layout so position, player, and rating stay aligned.
- The manager controls squad selection, tactics, and transfer targeting.
- Manager attributes are intentionally compact in V1: Training, Tactics, Transfers, Youth, Reputation, style, personality, wage, contract length, and employment status. `Man Management` and `Wage Discipline` are excluded.
- Manager rating is the average of Training, Tactics, Transfers, and Youth.
- Manager hiring/firing is not instant. Dismissal requires a compensation confirmation, and hiring requires a wage/contract offer with candidate compensation when the candidate is under contract.
- A manager action lock prevents repeated manager churn in the same short period, while still allowing a club without a manager to negotiate a replacement.
- V1 uses fictional clubs, players, competitions, badges, and copy only.
- V1 is local/offline only.
- Settings covers the local-only V1 save lifecycle directly in the app: manual save, export, import, reset, sound toggle, and text size. Import replaces Slot 1 only after schema validation/migration succeeds.

## Technology

- Use Next.js App Router with TypeScript and Tailwind CSS.
- Keep the game engine in pure TypeScript under `src/game`.
- Use Zustand for client-side game state.
- Use Dexie/IndexedDB for local saves.
- Use Zod for runtime validation and save migration.
- Use deterministic seeded random generation for reproducible simulations.
- Use `output: "export"` so the web build can be consumed by Capacitor from `out/`.
- Add Capacitor dependencies and config now, but delay native `ios/` and `android/` platform directories until packaging work starts.

## Design

- Mobile-first web app, later packaged with Capacitor.
- Clean modern green/white UI inspired by the supplied mockups, with original layout/copy/assets.
- Use lucide icons and shadcn-style primitives.
- Keep the bottom navigation fixed inside a phone-sized frame while tab content scrolls.
- Use `Create Club` as the primary first-run entry point.
- Expose primary club sections through dashboard metric buttons rather than duplicate top/bottom navigation.
- Use `Roster` as the player-list label in UI.
- The main play experience should run from Dashboard `Continue`, with secondary pages used for inspection and upgrades.
- Match preview is decision-only: `See Match` jumps to the result, and `Play Match` shows a fast no-control live playback before the same result summary.
- Dashboard should not show duplicate controls for the same feature; Training and Youth are opened from their metric cards only.
- Generated portrait avatars are part of V1 identity. They use one shared procedural SVG template, seeded by player/manager IDs where possible, so faces stay consistent across the career without storing image assets.
- Facilities use 1-99 ratings; upgrades increase by one rating point and display both one-time cost and weekly upkeep impact.
- Youth Academy and Training Ground are managed through dashboard popups, not a dedicated page.
- Downgrading a facility gives no cash refund, but lowers weekly upkeep.
- Facility popups allow preselecting `+1` through `+5` levels before applying an upgrade or downgrade.
- Action-heavy modals should keep primary confirmation controls sticky at the bottom where possible so required decisions are not hidden below long content.
- Settings lives as a secondary header action, not as a primary dashboard loop action, because it supports save/accessibility management rather than season progression.
- Cost/action screens must label the period or effect they represent, such as season totals, weekly wages, upgrade cost, capacity gain, or manager payoff.
- Financial surfaces must use `latestFinancialSnapshot` for period income, period expenses, and profit/loss so Dashboard, Finance, and financial event cards stay consistent.
- Budget decisions should show a confirmation event before the next unrelated manager proposal to prevent context jumps.
- Header period labels include both month and period number so repeated same-month decisions are clearly part of the same in-game period.
- Transfer/bid decision surfaces must clearly attribute the player context: external target vs current squad player, source club, bidding club, position, rating, age, and expected trust impact.
- Walking away from an external transfer target must not use squad-contract rejection language.
- Live match playback is a blocking full-screen state: club navigation resumes after the match result is completed.
- Match feedback areas must render a fallback message when there are no major events, rather than leaving empty space.
- Wage/fee option builders must always return visible selectable options, even for very small or missing base values.
