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
- The manager controls squad selection, tactics, and transfer targeting.
- V1 uses fictional clubs, players, competitions, badges, and copy only.
- V1 is local/offline only.

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
- Dashboard should not show duplicate controls for the same feature; Training and Youth are opened from their metric cards only.
- Generated portrait avatars are part of V1 identity. They use one shared procedural SVG template, seeded by player/manager IDs where possible, so faces stay consistent across the career without storing image assets.
- Facilities use 1-99 ratings; upgrades increase by one rating point and display both one-time cost and weekly upkeep impact.
- Youth Academy and Training Ground are managed through dashboard popups, not a dedicated page.
- Downgrading a facility gives no cash refund, but lowers weekly upkeep.
- Facility popups allow preselecting `+1` through `+5` levels before applying an upgrade or downgrade.
