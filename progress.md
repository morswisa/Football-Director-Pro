Original prompt: The Goal is to create an MVP of the game, a fully playable one that feels whole and complete in terms that all the functions work and make sense, including the numbers, relationships, and everything.

## 2026-05-29

- Closed a V1 Settings gap by implementing usable local save management: manual save, export copy/download, validated import into Slot 1, reset with confirmation, sound toggle, and text-size setting.
- Added Settings access from the game header and made the large text setting apply a scoped CSS size increase to common UI text classes.
- Added migration coverage for `managerActionLockUntilWeek` and `liveMatch` so imported/loaded V1 saves preserve those fields.
- Verified so far with `npm test`, `npm run lint`, `npm run build`, and `npm run e2e`.
- Tried to run the develop-web-game Playwright client, but its script could not resolve the local `playwright` package from the skill directory. Used the project Playwright e2e and in-app browser verification instead.
- Browser-verified Settings at 430x932 and saved `settings-verification.png`; controls fit and the large-text state is visible.
- Implemented the fictional Chairman's Cup as the V1 domestic cup: scheduled cup weeks, draw event, cup match preview/result, prize money, dashboard/history display, and unit/browser coverage.
- Implemented manager-led loans: loan-in, loan-out, wage-share costs, loan fee transactions, parent-club return at season end, UI controls, and unit/browser coverage.
- Added long-run balancing: sponsorship/debt/upkeep scaling, promotion/relegation relationship effects, match-driven board/trust changes, stadium condition decay, generated squad-depth safety, and long-run tests. The audit found and fixed empty AI squads after many seasons.
- Added a multi-season human-style Continue playtest and fixed the issues it exposed: low lower-league sponsorship, uneven post-season division sizes, and no-user-fixture rounds after season transitions. Verified with the full local test/build/e2e/browser/develop-web-game pass.
- Fixed manager contract lifecycle tuning: contracts now age at season change, compensation drops with remaining years, and short-term manager-action locks clear for the next campaign.
- Added the missing expired-manager-contract decision: week 1 now blocks on extending the manager or letting him leave when his contract reaches zero.
- Tightened the no-manager gate so releasing an expired manager parks queued season events until a replacement is hired.
- Added acceptance coverage that hiring a replacement manager resumes the parked season queue.
- Scoped transfer budgets to active transfer windows so stale strict/zero budgets do not keep affecting manager frustration after the window closes.
- Added visible impact summaries to the main chairman decision cards so trust, morale, balance, wage-bill, board, and replacement consequences are clearer before choices are confirmed.
- Added post-match impact notes showing actual board confidence, manager trust, and stadium condition changes after match simulation.

## 2026-05-30

- Added season-end impact tracking and display: season summaries now show balance, board confidence, manager trust, and reputation deltas, and History retains those season impact values.
- Added financial opening/closing balance context so reports reconcile period profit/loss with the displayed club balance.
- Added debt headroom context to bank warnings and exact over-limit context to bankruptcy game-over messages.
- Added debt-headroom context to manager firing and hiring modals so large compensation costs are clear before confirmation.
- Started final clean-save acceptance and fixed the player-section label mismatch by changing the dashboard metric to `Roster` and adding a `Roster` summary card above the sortable player list.
- Fixed another final-acceptance issue where generated clubs could appear as `Name 2`; new saves and normalization now prefer natural unused prefix/suffix combinations.
- Fixed live-match result leakage by making live playback replace the dashboard while running instead of rendering over an already-resolved dashboard.
- Fixed a finance consistency issue: weekly balance updates and financial report line items now share one breakdown, and ticket sales are shown even when the period is loss-making.
- Fixed event-header attribution so financial reports and generic club updates no longer show the current manager by default.

## Next TODO

- Run the final web-V1 acceptance pass from a clean save and fix only issues inside the original planned scope.
- During final acceptance playtesting, watch for any remaining chairman choice that changes trust/fan/finance without an on-card explanation.
- Continue final mobile acceptance checks across all V1 surfaces and longer balance runs.
- Re-run longer balance tuning after the shared finance breakdown change, especially wages, manager compensation, facility upkeep, sponsorship, debt pressure, and transfer/loan frequency.
- Complete one final mobile QA pass across all planned V1 surfaces.
- Add Capacitor native iOS/Android platforms only after the web V1 is accepted.
- Latest preview after finance consistency pass: `https://football-director-6s36ltubi-mor-swisas-projects.vercel.app`.
