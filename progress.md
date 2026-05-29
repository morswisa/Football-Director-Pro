Original prompt: The Goal is to create an MVP of the game, a fully playable one that feels whole and complete in terms that all the functions work and make sense, including the numbers, relationships, and everything.

## 2026-05-29

- Closed a V1 Settings gap by implementing usable local save management: manual save, export copy/download, validated import into Slot 1, reset with confirmation, sound toggle, and text-size setting.
- Added Settings access from the game header and made the large text setting apply a scoped CSS size increase to common UI text classes.
- Added migration coverage for `managerActionLockUntilWeek` and `liveMatch` so imported/loaded V1 saves preserve those fields.
- Verified so far with `npm test`, `npm run lint`, `npm run build`, and `npm run e2e`.
- Tried to run the develop-web-game Playwright client, but its script could not resolve the local `playwright` package from the skill directory. Used the project Playwright e2e and in-app browser verification instead.
- Browser-verified Settings at 430x932 and saved `settings-verification.png`; controls fit and the large-text state is visible.
- Implemented the fictional Chairman's Cup as the V1 domestic cup: scheduled cup weeks, draw event, cup match preview/result, prize money, dashboard/history display, and unit/browser coverage.

## Next TODO

- Continue remaining V1 scope: loans, richer long-run balancing, activeProposal retirement, season-end clarity, and Capacitor native platform generation after web V1 acceptance.
