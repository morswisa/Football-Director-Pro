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

## Next TODO

- Finish the replacement-manager queue resume coverage with commit and push.
- Continue remaining V1 scope: final playtest acceptance, any resulting balance fixes, and Capacitor native platform generation after web V1 acceptance.
- Latest preview after replacement-manager queue resume coverage: `https://football-director-cg01t2rja-mor-swisas-projects.vercel.app`.
