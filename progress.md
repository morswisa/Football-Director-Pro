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

- Closed a final-acceptance gap in `Play Match`: the e2e audit found final-whistle Continue skipped the normal match-result summary. Added `finishLiveMatch`, normalized interrupted live playback back to a finished result summary, and added e2e/unit coverage. Verified with `npm run e2e`, `npm run lint`, `npm test` (43 tests), `npm run build`, the `develop-web-game` screenshot client, and a focused mobile live-match screenshot. Deployed preview: `https://football-director-gq92lvz0s-mor-swisas-projects.vercel.app`.
- Added season-end impact tracking and display: season summaries now show balance, board confidence, manager trust, and reputation deltas, and History retains those season impact values.
- Added financial opening/closing balance context so reports reconcile period profit/loss with the displayed club balance.
- Added debt headroom context to bank warnings and exact over-limit context to bankruptcy game-over messages.
- Added debt-headroom context to manager firing and hiring modals so large compensation costs are clear before confirmation.
- Started final clean-save acceptance and fixed the player-section label mismatch by changing the dashboard metric to `Roster` and adding a `Roster` summary card above the sortable player list.
- Fixed another final-acceptance issue where generated clubs could appear as `Name 2`; new saves and normalization now prefer natural unused prefix/suffix combinations.
- Fixed live-match result leakage by making live playback replace the dashboard while running instead of rendering over an already-resolved dashboard.
- Fixed a finance consistency issue: weekly balance updates and financial report line items now share one breakdown, and ticket sales are shown even when the period is loss-making.
- Fixed event-header attribution so financial reports and generic club updates no longer show the current manager by default.
- Changed informational event Continue buttons to normal footer actions so long financial reports remain readable without rows being covered.
- Fixed a season-transition stall where reused fixture IDs could make `seenEventKeys` suppress next-season match previews.
- Added multi-seed season-boundary coverage for several deterministic careers crossing at least two seasons without queue stalls.
- Ran final-balance diagnostics across several four-season careers and tightened lower-league cashflow: ticket prices now scale by division, and lower-league season awards are smaller unless the club earns a top finish/promotion.
- Verified the balance pass with `npm test` (40 tests), `npm run lint`, `npm run build`, `npm run e2e`, and the develop-web-game Playwright screenshot pass.
- Ran transfer-balance diagnostics and fixed sale-world consistency: confirmed sold players now join the buying club instead of becoming unattached. Added regression coverage and verified with the full local test/build/e2e/browser pass.
- Added first-team sale tradeoffs: selling an important player can reduce board confidence and squad morale, with UI previews before the chairman confirms. Verified with the full local test/build/e2e/browser pass.
- Added manager replacement pressure after starter sales: the Continue queue now surfaces replacement need, and transfer windows can immediately produce a manager-led same-position target. Verified with the full local test/build/e2e/browser pass.
- Added permanent replacement-target acceptance coverage for starter sales: if a suitable affordable market player exists, the queued replacement target must be same-position and close enough in rating. Verified with the full local test/build/e2e/browser pass.
- Expanded the clean-save mobile acceptance path across the main V1 surfaces and early Continue queue. This exposed and fixed a real event-header attribution issue where the opening League Path club update could show manager context; club updates now render the club header unless the event is explicitly manager-subject.
- Verified the acceptance-header pass with `npm run e2e`, `npm run lint`, `npm test` (41 tests), `npm run build`, the develop-web-game Playwright client, and a focused mobile screenshot of the League Path event.
- Deployed acceptance-header pass to Vercel preview: `https://football-director-reocha0wa-mor-swisas-projects.vercel.app`.
- Continued the deep acceptance pass through first match result. Found and fixed queue-order drift where a direct transfer-target response could appear after a match because older events were already queued.
- Added regression/e2e coverage for immediate decision follow-ups and the first match-result flow, then verified with `npm run e2e`, `npm test` (41 tests), `npm run lint`, `npm run build`, the develop-web-game client, and focused mobile screenshots.
- Deployed queue-order/deep-acceptance pass to Vercel preview: `https://football-director-g91l7byct-mor-swisas-projects.vercel.app`.
- Extended transfer-window acceptance coverage for successful buy, loan-in, and loan-out decisions: player movement, balance deltas, manager-trust deltas, immediate response copy, and financial snapshot fee lines are now asserted. Verified with `npm test` (41 tests), `npm run lint`, `npm run build`, `npm run e2e`, and the develop-web-game client.
- Added sale-chain acceptance coverage for a starter sale across the actual Continue order: sale-ready preview, sale-confirmed board/morale impact, replacement-pressure update, and same-position replacement target. Verified with `npm test` (42 tests), `npm run lint`, `npm run build`, `npm run e2e`, and the develop-web-game client.
- Extended season-boundary acceptance coverage for relegation: negative season summary, season impact, next-division intro, and first match preview in the relegated division now run as one tested Continue sequence. Verified with `npm test` (42 tests), `npm run lint`, `npm run build`, `npm run e2e`, and the develop-web-game client.

## Next TODO

- Latest status answer: the broad planned V1 gameplay systems are implemented. What remains is to finish and commit/deploy the in-progress save import/export acceptance coverage, run final clean-save web acceptance, close only original-scope issues found there, complete mobile QA and longer balance tuning, then add Capacitor native platforms after web V1 approval.
- Settings import/export acceptance coverage is now implemented, locally verified, deployed, committed, and pushed to `main`: `npm run e2e`, `npm run lint`, `npm test` (42 tests), `npm run build`, and the `develop-web-game` screenshot pass all completed. Latest preview for this slice: `https://football-director-r8aad0mt4-mor-swisas-projects.vercel.app`. Commit: `ae566e0`.
- Current status response: broad V1 feature implementation is mostly complete; remaining work is final acceptance, balance/mobile polish, and native packaging after web acceptance.
- Run the final web-V1 acceptance pass from a clean save and fix only issues inside the original planned scope.
- Continue final acceptance from other high-touch V1 flows, now that `Play Match` has browser coverage: manager hire/fire, stadium repair/upgrade, and longer finance-heavy periods.
- During final acceptance playtesting, watch for any remaining chairman choice that changes trust/fan/finance without an on-card explanation.
- Continue final mobile acceptance checks across all V1 surfaces and longer balance runs.
- Continue longer balance tuning after the ticket/prize pass, especially transfer-sale windfalls, wages, manager compensation, facility upkeep, sponsorship, debt pressure, and transfer/loan frequency.
- Continue final acceptance around replacement quality after repeated sales and whether the manager target pool feels varied enough.
- Complete one final mobile QA pass across all planned V1 surfaces.
- Add Capacitor native iOS/Android platforms only after the web V1 is accepted.
- Latest preview after transfer-decision coverage: `https://football-director-mdxeef9tf-mor-swisas-projects.vercel.app`.
- Latest preview after sale-chain coverage: `https://football-director-prnruhqdb-mor-swisas-projects.vercel.app`.
- Latest preview after season-boundary coverage: `https://football-director-98cyzjg07-mor-swisas-projects.vercel.app`.
- Latest preview after Settings import/export acceptance coverage: `https://football-director-r8aad0mt4-mor-swisas-projects.vercel.app`.
- Latest preview after live-match acceptance coverage: `https://football-director-gq92lvz0s-mor-swisas-projects.vercel.app`.
