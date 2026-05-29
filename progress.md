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

## Next TODO

- Run the final web-V1 acceptance pass from a clean save and fix only issues inside the original planned scope.
- During final acceptance playtesting, watch for any remaining chairman choice that changes trust/fan/finance without an on-card explanation.
- Watch for any remaining large manager-compensation moments that need clearer explanation.
- Continue balance tuning for wages, manager compensation, facility upkeep, sponsorship, debt pressure, and transfer/loan frequency across longer human-style careers.
- Complete one final mobile QA pass across all planned V1 surfaces.
- Add Capacitor native iOS/Android platforms only after the web V1 is accepted.
- Latest preview after debt-context pass: `https://football-director-di8gqbqd6-mor-swisas-projects.vercel.app`.
