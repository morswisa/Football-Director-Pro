# V1 Acceptance Audit

Date: 2026-05-30

## Scope

This audit tracks the original Web V1 objective: a local/offline, web-first chairman football simulation that feels playable and coherent across the core loop, numbers, relationships, and V1 management surfaces.

Native iOS/Android binary output is not counted as Web V1 gameplay completeness. Capacitor project shells and sync workflow exist, but local binary builds still require Java Runtime/JDK and full Xcode.

## Current Verdict

Web V1 gameplay systems are implemented and covered by browser and engine evidence. The remaining work is finalization, not broad feature construction:

- Continue one final clean-save playtest/audit pass.
- Fix only original-scope defects found by that pass.
- Run one last mobile readability and long-balance verification pass.
- Build native binaries once the local native toolchains are available.

## Requirement Evidence

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Create a new fictional club and start a playable career | `e2e/game.spec.ts` `new career reaches playable dashboard`; `tests/engine.test.ts` `creates a deterministic world` | Covered |
| Dashboard-centered Continue loop with blocking decisions | `tests/engine.test.ts` `drives the dashboard through a blocking event queue`; e2e clean-save and first-match paths | Covered |
| 7 fictional divisions, stable league tables, promotion/relegation | engine deterministic-world, relegation, multi-season, season-boundary tests | Covered |
| Domestic cup with prize and history impact | `e2e/game.spec.ts` `domestic cup flow shows match, prize money, and history`; engine cup test | Covered |
| Manager-led transfers only, no manual scouting/search | `tests/engine.test.ts` `generates manager-led proposals without manual scouting`; transfer/loan/sale e2e tests | Covered |
| Paid transfer negotiation with fee/wage/contract and finance trail | `e2e/game.spec.ts` `paid transfer signing shows player and finance trail`; engine paid-transfer tests | Covered |
| Loans and sales with roster and finance consequences | loan and player-sale e2e tests; engine loan/sale/replacement tests | Covered |
| Manager hiring/firing, contracts, compensation, emergency replacement | manager dismissal and manager contract-expiry e2e tests; engine manager tests | Covered |
| Live match and instant match modes | `e2e/game.spec.ts` `play match runs live before returning to the result`; engine live playback tests | Covered |
| Financial reports reconcile across Dashboard/Finances/modals | `e2e/game.spec.ts` `financial reports stay consistent across several continue periods`; engine financial snapshot tests | Covered |
| Debt warnings and bankruptcy stop state | debt e2e test; engine debt tests | Covered |
| Stadium, Training, Youth upgrades/downgrades with visible cost impact | stadium e2e test; facility/stadium engine tests | Covered |
| Youth contracts and promoted players | youth contract e2e test; engine youth/facility tests | Covered |
| History, achievements, records, season impact | repeated season-review e2e test; achievement/stadium e2e coverage; season-summary engine tests | Covered |
| Local save/export/import/settings | `new career reaches playable dashboard` includes Settings export/import validation | Covered |
| Mobile-first readability and no broken numeric text | `e2e/game.spec.ts` `mobile V1 surfaces stay readable without horizontal overflow` | Covered |
| Long-run economy and relationship sanity | engine long-run balance tests: multi-season, multi-seed, human-style career, stable balance-band coverage | Covered |
| Web build and mobile sync | latest run: `npm run mobile:sync`; Capacitor doctor; Vercel preview | Covered for web/Capacitor sync |
| Native Android/iOS binary build | Requires Java Runtime/JDK and full Xcode in the local environment | Environment-blocked |

## Latest Verification

- `npx playwright test e2e/game.spec.ts -g "clean save reaches repeated season reviews and history in browser"`: passed, 1/1, 44.5s.
- `npm run lint`: passed.
- `npm test`: passed, 46/46.
- `npm run e2e`: passed, 15/15.
- `npm run mobile:sync`: passed.
- `develop-web-game` screenshot smoke check: passed.
- Previous full slice verification from the current code line: `npm run mobile:sync`, `npm run mobile:doctor`, `npm run lint`, `npm test` (46 tests), `npm run e2e` (15 tests), and `develop-web-game` screenshot smoke check passed.
- Latest Vercel preview: `https://football-director-285kwpxkv-mor-swisas-projects.vercel.app`.

## Remaining Work

1. Run one final full verification gate after this audit artifact is committed.
2. Perform a last manual/browser clean-save playtest looking specifically for unclear numbers, trust/fan/board deltas, and modal readability.
3. If no original-scope issues are found, treat Web V1 as accepted and move to native binary builds.
4. Install or provide Java Runtime/JDK and full Xcode before attempting `npm run mobile:build:android` and `npm run mobile:build:ios`.
