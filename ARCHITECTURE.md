# Architecture

## Overview

Football Director Pro is a Next.js web app with a client-side deterministic simulation engine. The app runs offline after load and persists saves locally in IndexedDB.

## Layers

- `src/app`: App Router pages and route shells.
- `src/components`: React UI components and shadcn-style primitives.
- `src/store`: Zustand client state that coordinates UI actions, persistence, and engine functions.
- `src/game`: Pure TypeScript game model, schemas, deterministic random helpers, world generation, and simulation engine.
- `src/lib`: Shared utilities.
- `tests`: Unit tests for deterministic game logic.
- `e2e`: Playwright browser smoke tests.
- `capacitor.config.ts`: Capacitor app metadata and static web directory.
- `MOBILE_BUILD.md`: Reproducible mobile packaging workflow and local toolchain prerequisites.
- `NATIVE_BUILD_AUDIT.md`: Current local native binary build readiness, including Java/JDK and Xcode blockers.
- `scripts/check-native-toolchain.mjs`: Native readiness checker used by `npm run mobile:toolchain`.
- `V1_ACCEPTANCE_AUDIT.md`: Requirement-to-evidence audit for Web V1 gameplay completeness and remaining finalization work.
- `ios/` and `android/`: Generated Capacitor native project shells for packaging the static `out/` web build into mobile apps.
- `.vercelignore`: Excludes native project folders from web preview deployments.

## Data Flow

1. New game form creates a `GameSave` through `createNewGame`.
2. Zustand stores the active save in memory.
3. Engine actions return a new `GameSave`; UI never mutates game data directly.
4. Autosave writes the active save to IndexedDB.
5. Load game validates and migrates the saved payload before hydrating Zustand.
6. Store hydration normalizes display names so duplicate generated club names and same-club player names are disambiguated before rendering. Club-name disambiguation prefers unused fictional prefix/suffix combinations rather than numeric suffixes.
7. Settings exposes local-only save control through Zustand: manual save, JSON export, JSON import after Zod migration/validation, reset by deleting Slot 1 from IndexedDB, and persistent accessibility/audio preferences.
8. Production build emits static files to `out/` for Capacitor sync.
9. `npm run mobile:sync` runs the static build and copies generated web assets into the iOS and Android project asset folders.
10. `npm run mobile:doctor` verifies Capacitor native project health; `npm run mobile:build:android` and `npm run mobile:build:ios` are the intended local binary build commands once Java Runtime/JDK and full Xcode are installed.
11. Dashboard `Continue` calls the event generator. It either shows an existing event, pops the next queued event, or generates the next period's event chain.
12. Required user decisions are represented in save state, rendered as blocking UI, and must be resolved before match/week progression can be triggered from the UI.

## Navigation

- `/game` is a single client-side career surface.
- Primary sections are selected by local tab state from dashboard metric buttons: Dashboard, Standings, Roster, Manager, Finances, Stadium, History, and Settings.
- There is no separate top section grid or bottom navigation; non-dashboard sections provide a Back to Dashboard action.
- Standings are derived from `leagueTable(save)` and rendered from the current division records.
- The Standings tab renders mobile-first league rows instead of a compact table. Each row shows rank, club, points, played, W-D-L, and goal difference, keeping the full competition context visible on phone widths.
- League fixtures are generated with a round-robin scheduler: each club in the user's division appears once per league round, then fixtures repeat with reversed home/away legs.
- League fixture IDs include the season as well as division, round, and slot, preventing persisted `seenEventKeys` from suppressing next-season match previews.
- Roster rows use fixed Pos/Player/Rate columns with sticky sort controls to keep list context visible while scrolling.
- Roster rows also show Morale, Form, and Fitness so decision-driven player state changes can be inspected without leaving the roster surface.
- Dashboard owns the main save-backed event flow: season intro, average crowd report, transfer window opening, transfer budget, financial report, bank warning, manager frustration/retirement hints, manager contract expiry, contract offers/responses, incoming bids, sale events, youth decisions, Hall of Fame, match preview, match result, and season summaries.
- Dashboard layout prioritizes a polished chairman summary followed immediately by the next-match/Continue action, then secondary metric buttons. This keeps the primary event queue action visible before deeper inspection controls on mobile.
- After `finishSeason`, the next generated queue presents the previous season's `season_summary` before the new season intro, so the player sees rewards, movement, and history before starting the next campaign.
- `SeasonHistory.seasonImpact` stores the before/after values for balance, board confidence, manager trust, and club reputation, allowing the season-summary event and History screen to explain season-level relationship/economy movement.
- The History screen renders season-impact point deltas with explicit `Season impact`, `Board`, `Trust`, and `Reputation` labels so relationship movement remains inspectable after the Continue modal is closed.
- Achievement rows expose stable test IDs and progress hooks so browser acceptance can prove gameplay-triggered unlocks, such as stadium upgrades unlocking `Concrete Plans`.
- Match preview resolves through `resolveEvent`: `See Match` creates the result event immediately, while `Play Match` simulates once, stores `GameSave.liveMatch`, and lets the UI reveal the already-created result progressively.
- Match-result event creation captures the user club's relationship/facility snapshot before simulation and compares it with the post-simulation state, then writes the actual board confidence, manager trust, and stadium condition deltas into the event note.
- Live match playback renders as the only active career surface while it is running and advances one minute per tick, preventing background dashboard controls or final-result data from being visible before final whistle.
- Live match completion is a two-step UI flow: `finishLiveMatch` marks the saved live playback as finished at 90 minutes, then the still-current `match_result` event renders its normal summary before `resolveEvent` clears the result.
- `normalizeGameState` converts an unfinished `liveMatch` with an existing `match_result` event into a finished live state, so a refresh during playback returns to the result summary instead of replaying or resimulating the fixture.
- Blocking event decisions are stored in `currentEvent` and take priority over ordinary page interaction.
- Decision controls render local impact summaries from the same values passed into `resolveEvent`, so the player sees expected trust, morale, balance, wage-bill, board, or replacement consequences before confirming.
- Contract and paid-transfer negotiation controls are compact subcomponents inside event cards. They render larger option grids, selected-state styling, selected impact summaries, and grouped decision actions in the content flow so footers do not obscure selectable terms.
- Event entity headers are subject-driven: `playerId` renders player context, manager headers render only for manager-subject events, and all other club updates render the club header even if an older queued event still carries incidental manager metadata.
- Event actions distinguish blocking decisions from informational updates: decision controls can stay sticky for reachability, while ordinary Continue actions remain inline to avoid covering long report rows.
- Roster sorting is client-local UI state; it supports position, player-name, and rating sorts and does not mutate save data.
- Facility management is launched from dashboard cards via local modal state.
- Training and Youth facility upgrades write same-period finance transactions, appear in infrastructure spending, and refresh current/queued financial reports. Downgrades do not refund cash but refresh reports because they alter weekly upkeep.
- Training and Youth facility management is launched from their dashboard metric cards only.
- Settings is reachable from the header gear button and returns to the Dashboard through the same secondary-page back pattern.
- Secondary pages share `PageBack`, a compact accessible Dashboard chip. This keeps return navigation consistent without consuming the vertical space of a full card.
- Store status messages render inside the scrollable content area, before the active tab content, so feedback remains visible without covering lower-page action buttons.
- Status banners are suppressed while event or facility modals are active, keeping the blocking decision layer visually focused.
- `GameClient` wraps tab changes with status-message clearing. This keeps transient save/action messages scoped to the current surface and prevents stale banners from following quick navigation into secondary sections.

## Portraits

- `PersonAvatar` in `src/components/game-client.tsx` renders all player and manager portraits.
- Portraits are generated as inline SVG from deterministic seeds; entity IDs are used when available, with names as fallback for match events that only store scorer names.
- The shared face template varies skin tone, hair color, hair style, face shape, eye/brow details, nose, mouth, glasses, shirt color, and manager styling.
- No bitmap portrait assets are stored in V1; the portrait system is deterministic and local-only.

## Event Queue

- `GameSave.eventQueue` stores pending `GameEvent` objects.
- `GameSave.currentEvent` stores the event currently blocking or informing the player.
- `GameSave.seenEventKeys` prevents repeated one-off events such as season intros and transfer-window announcements.
- `GameSave.transferBudget` stores the active chairman budget stance for the current transfer window.
- `GameSave.pendingDeals` stores staged sale flows between incoming bid, sale ready, and sale confirmed.
- `GameSave.financialSnapshot` stores the latest generated financial breakdown for display and persistence.
- `latestFinancialSnapshot(save)` is the shared read model for Dashboard, Finance, and financial event cards, including opening balance, closing balance, income, expenses, and period profit/loss.
- Financial report cards show period total income, total expenses, and report result beside opening/closing balance. Browser acceptance compares those values against Dashboard and the Finances screen after several Continue periods.
- `buildFinancialLines` is the shared weekly finance line-item model for both balance mutation and financial snapshots. Weekly operations use the operating subset, while report snapshots also fold in same-week transfer, loan, manager, prize, and cup transactions that already changed the balance.
- Transfer-fee transactions are written into club finance transactions and used to refresh queued financial reports so fees appear in `feesOut` or `feesIn`.
- Loan-fee transactions share the same financial report path as transfer fees. Loaned players carry `Player.loan`, including parent club, temporary club, expiry season, and weekly wage share.
- Browser loan acceptance imports deterministic loan-in and loan-out events to verify the Roster movement, loan labels, manager-trust response copy, and `Loan fee paid`/`Loan fee received` visibility.
- Browser cup acceptance imports a deterministic Chairman's Cup tie to verify the draw event, cup match preview/result, prize-money financial report, unchanged league table record, History cup run, and `Cup prize` transaction in Finances.
- Stadium upgrade and repair transactions are recorded as same-period infrastructure spending and refresh `latestFinancialSnapshot`, so direct stadium capex is visible in Finances after the action.
- Transfer-window acceptance coverage verifies completed paid purchases, loan-ins, and loan-outs across world ownership, balance movement, manager-trust changes, and financial snapshot fee lines.
- Browser transfer acceptance uses an imported deterministic paid target to verify the full player-facing path: transfer decision impact, completed signing, Roster membership, and `Transfer fee paid` visibility in Finances.
- Browser contract acceptance uses an imported deterministic squad player to verify weak-offer warnings, contract rejection feedback, and the resulting morale drop displayed in Roster.
- Browser youth-contract acceptance uses an imported deterministic academy player to verify the decision card, promotion follow-up event, and resulting Roster morale/form/fitness display.
- Browser sale acceptance uses an imported deterministic incoming bid to verify bid acceptance, sale confirmation, replacement pressure, replacement-target handoff, Roster removal, teammate morale impact, and `Transfer fee received` visibility in Finances.
- Transfer-budget decisions resolve into a confirmation event before the queue continues to later proposals.
- Transfer budgets are cleared automatically when `pushStandardEvents` runs outside a transfer-window week; manager frustration only considers strict/zero budget while the window is open.
- Engine functions `generateNextEvents`, `resolveEvent`, and `advanceAfterQueueEmpty` keep event logic outside React.
- Events created as direct follow-ups during `resolveEvent` are promoted ahead of older queued events before `popNextEvent`, preserving decision-response continuity inside the Continue loop.
- Engine function `normalizeGameState` is used by the store to normalize older or generated saves before UI hydration.
- Paid buy proposals are resolved inside `resolveEvent` with fee, wage, and years terms. Selling clubs may reject low fees, and players may reject weak contracts.
- UI impact summaries for transfer, loan, contract, sale, youth, and manager-contract decisions are previews only; the engine remains authoritative and applies the final deltas through `resolveEvent`.
- Buy-proposal rejection resolves to a target-specific response event, while squad contract rejection uses squad-specific language.
- Sale proposals carry `toClubId` and staged `PendingDeal.buyerClubId` so bid, sale-ready, and sale-confirmed events can attribute the bidding club.
- Sale confirmation transfers the player record to `PendingDeal.buyerClubId`, removes the player from the user club, adds him to the buyer's squad, and clears loan state before refreshing the user wage bill.
- `calculateSaleImpact` centralizes the relationship/morale tradeoff for player sales. The engine applies the final board-confidence and squad-morale deltas, and the UI uses the same helper for incoming-bid and sale-ready previews.
- `enqueueReplacementAfterSale` adds a manager replacement-pressure event after starter sales and can queue a same-position buy proposal during transfer windows using the existing manager-led negotiation flow.
- `GameSave.liveMatch` stores transient live-playback metadata so the fixture is not simulated twice when the user chooses `Play Match`.
- `GameSave.cup` stores the current seasonal Chairman's Cup run. Cup fixtures are stored in `fixtures` with `competition: "cup"` and are resolved through the same match preview/result modal path, but they do not update league records.
- Legacy `activeProposal` has been removed. Manager-led transfer, loan, sale, and contract proposals are represented only as `GameEvent` records in `eventQueue/currentEvent`.

## Calendar And Economy

- Internal progress still uses `week` and `currentRound`, but UI presents `monthForWeek`.
- Transfer-window gating currently allows buy/sell/loan proposals in August and January.
- Manager proposal cadence is intentionally gated: transfer-window months can surface transfer/loan/sale decisions, while non-window proposals are limited to periodic contract-review weeks to keep the Continue loop active without flooding the player.
- Loan lifecycle is season-scoped. Loan-in players count toward the temporary squad at their wage-share cost; loan-out players leave the squad until `returnSeasonLoans` restores them to the parent club before the next season starts.
- Cup rounds are scheduled by `cupRoundWeeks` in `src/game/calendar.ts`; each tie creates draw/match events, pays cup prize money, and records the run in `GameSave.cup.results`.
- Season-end prize payments are configured by division level in `src/game/calendar.ts`, with upper-league values modeled after English central payment/merit-payment structures and lower fictional leagues scaled down.
- Lower-league season prizes use smaller per-position values and explicit promotion/top-finish bonuses so weak finishes do not create large cash windfalls.
- League matchday income uses division-level ticket prices inside `calculateMatchdayIncome`, while attendance still comes from stadium capacity and club reputation.
- `SeasonHistory` stores the season's finish, record, goals, prize money, outcome, next division, cup summary, trophies, and closing balance for both the season-summary event and History screen.
- Season impact deltas are captured inside `finishSeason` from the actual mutated club state, including promotion/relegation reputation changes, so the UI does not duplicate the season-outcome formula.
- Season transitions rebalance sponsorship, debt limit, and upkeep from division level, reputation, stadium capacity, and facility ratings.
- Debt warnings are generated from the current club finance state and include debt headroom; `checkDebtAndBankruptcy` is the authoritative career-stop gate and writes the exact balance/debt-limit failure context.
- Browser debt acceptance imports deterministic warning/game-over saves to verify the warning copy and the accessible blocking `Career stopped` dialog.
- League matchday income is recorded as a same-week finance transaction for reporting, but the balance is moved by the shared weekly operations calculation, preventing ticket-sales display from disappearing on loss-making home weeks.
- Promotion/relegation swaps a club between adjacent divisions so division sizes remain stable for future fixture generation.
- Balance edge cases are covered in unit tests: debt-limit game over, no-refund facility downgrades with lower upkeep, manager action locks, and relegation division movement.
- Human-style multi-season coverage resolves real Continue events with conservative chairman decisions and periodic facility investments to verify that the playable loop progresses across seasons.
- Season-transition coverage includes a regression for reused fixture/event IDs so the Continue queue cannot stall at week 1 of a later season.
- Season-boundary coverage also verifies relegation as a player-facing Continue sequence: `season_summary` with negative impact, next-division `season_intro`, and a new-season `match_preview` from the relegated division.
- Multi-seed season-boundary coverage runs deterministic Continue-loop careers across multiple completed seasons to catch seed-specific event-queue stalls.
- Balance coverage includes division-scaled matchday income and lower-league season-award ordering, in addition to the longer multi-season stability tests.
- Transfer consistency coverage proves incoming-bid sale confirmation moves the player into the buyer club's squad instead of orphaning the player.
- Sale-tradeoff coverage proves key-player sales apply the expected board-confidence and squad-morale impact.
- Replacement-pressure coverage proves confirmed starter sales queue a manager follow-up instead of leaving squad quality loss silent.
- Replacement-target coverage also proves that, when the market has an affordable candidate, the queued manager buy proposal is same-position and within the intended rating gap from the sold starter.
- Sale-chain coverage verifies the user-facing order across `sale_ready` -> `sale_confirmed` -> `Replacement needed` -> replacement `contract_offer`, so a starter sale remains understandable across multiple Continue presses.
- Match results adjust board confidence, manager trust, and stadium condition so relationships and facilities move over time instead of staying static.
- The post-match impact note is generated from those actual stored values, not from a duplicated UI-only formula.
- `ensureClubSquadDepth` creates generated reserve players when retirements or loans leave a club below playable depth, preventing long-run fixture failures.
- `src/game/economy.ts` owns formula-based wage helpers for players and managers plus manager compensation.
- Player wages scale by division level, rating, age band, squad role, and potential gap.
- Manager wages scale by division level, rating, reputation, and personality premium.
- Manager compensation is weekly wage times 4.33 times remaining contract months.
- Manager contracts are aged during `startNextSeason`, and contracted-manager compensation is recalculated after the remaining years decrease.
- Expired current-manager contracts are queued as `manager_contract_decision` events during week 1. Resolving the event either writes a new wage/term to the manager or removes the manager and forces the existing hire-manager gate.
- `generateNextEvents` returns without popping queued season events when the user club has no manager, so the missing-manager gate cannot be bypassed by repeated Continue calls.
- After `submitManagerHireOffer` appoints a replacement, the parked queue remains intact and the next `generateNextEvents` call resumes the first queued season event.

## Managers

- Manager data no longer includes `manManagement` or `wageDiscipline`.
- Manager rating is calculated from Training, Tactics, Transfers, and Youth.
- Team strength uses manager Tactics, Training, and Reputation.
- Manager candidates can be `free_agent` or `contracted`; contracted candidates carry a compensation fee.
- Hiring and firing are engine actions with financial consequences and a short action lock, coordinated through Zustand and rendered as Manager tab modals.
- Manager cost modals compute post-action balance and debt headroom client-side from the same immediate costs sent to the engine; `confirmFireManager` and `submitManagerHireOffer` remain the authoritative mutation and bankruptcy gates.
- The manager action lock is season-scoped and clears when a new season starts so late-season changes cannot freeze manager decisions into the next campaign.
- The UI mirrors the engine's emergency replacement exception: `managerActionLocked` disables manager churn only when the club already has a manager; if no manager is appointed, the Manager tab still allows one replacement negotiation.
- The no-manager blocking modal is suppressed on the Manager tab so the player can actually negotiate with candidates after following the modal's prompt.
- Manager contract-expiry decisions reuse the event modal and deterministic wage formulas, not a separate React-only state path.
- If an expired manager leaves, the follow-up message is shown immediately; after it is dismissed, queued season events remain parked until the Manager tab hires a replacement.
- Browser manager-contract acceptance imports deterministic expired-contract events to verify extension, forced no-manager blocking, the hire-manager gate, and replacement hiring from the Manager screen.

## Core Constraints

- Engine modules must not import React, DOM APIs, Zustand, or Dexie.
- Manager-led transfers are the only transfer flow in V1.
- Manager-led proposals must be approve/reject decisions; no manual scouting/search UI.
- Blocking decision UI must not introduce new game systems outside the original V1 plan.
- Core engine position model is G/D/M/F.
- All save data must include a schema version.
- Import must reject invalid JSON or non-V1 save payloads before overwriting Slot 1.
- Public UI text and fictional content must be original.

## Verification

- `npm run lint`
- `npm test`
- `npm run build`
- `npm run e2e`
- Manual mobile browser smoke test at `430x932`
- `npm run mobile:sync` for static export and Capacitor asset sync
- `npm run mobile:doctor` for native project health
- Expanded clean-save Playwright acceptance path covering the main V1 surfaces and early Continue queue.
- Deep clean-save Playwright acceptance also covers reaching the first match result, checking the match impact note, and returning to Dashboard with Last Result visible.
- Settings acceptance coverage verifies the local save lifecycle from the browser: export produces usable JSON, invalid import input is rejected, valid imported JSON replaces Slot 1, and the imported save can continue through the event queue.
- Live-match acceptance coverage verifies the `Play Match` route: live state, one-minute progression, no Continue before final whistle, normal match-result summary after final whistle, and Dashboard Last Result after dismissal.
- Manager acceptance coverage verifies the UI-level hire/fire economy: dismissal compensation, debt context, emergency no-manager replacement, hire cost/wage context, successful replacement, and locked controls after hiring.
- Manager acceptance coverage also verifies that dismissal compensation remains inspectable in the Finances screen as a recent transaction after a replacement is hired.
- Stadium acceptance coverage verifies upgrade/repair from the browser, including capacity/condition changes and matching financial transaction/infrastructure visibility.
- Multi-period finance acceptance coverage runs several Continue periods, checks financial report balance movement/copy for `NaN`, and verifies the latest report values match Dashboard and Finances surfaces.
- Mobile-surface acceptance coverage opens Dashboard, League, Roster, Manager, Finances, Stadium, History, Training, Youth, Settings, and a Continue event on the Pixel-sized Playwright project, asserting no page-level horizontal overflow and no visible `NaN`/`undefined` text.
- Long-run balance coverage now runs several human-style careers across three seasons, asserting playable debt headroom, bounded wage pressure, finite financial snapshots, stable relationships, viable squads, and stable division sizes.
- Clean-save season-boundary acceptance verifies that a browser career reaches repeated season reviews, shows season awards and impact, continues into later season intros without queue stalls, and then shows multiple completed seasons with impact labels in History.
- Youth-contract browser acceptance verifies the academy decision path from event card to promoted Roster player state.
- Sale browser acceptance verifies the sale chain across the event queue and the main inspection surfaces, not just the engine mutation.
- Loan browser acceptance verifies both temporary incoming and outgoing player movement across the event queue, Roster, and Finances.
