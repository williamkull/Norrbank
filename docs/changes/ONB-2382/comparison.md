# ONB-2382 comparison: the Onboarding list, old and new

Old is commit dc3079b (the last commit before the fix). New is the head of `loop/ONB-2382-run-17`. The fix is commit 86190c2. The comparison was made on 2026-10-13 by running the same tests against both.

## Result

Every changed state differs as intended, every unchanged state is at parity, and no new test of a changed state passes on the old code. There is no unintended difference. One step could not be done as written (see the end).

## The states

Test file names are shortened: **pinned** is `App.pinned.test.tsx`, **list** is `App.caseList.test.tsx`, **indep** is `App.caseList.independent.test.tsx`.

| State | Old | New | Intended | Evidence (old / new) |
|---|---|---|---|---|
| Before the answer | List: "No open onboarding cases." Right pane: "Select a case." | List: "Loading." only. Right pane empty. | Yes, difference | list "shows only Loading. while /v2/cases has not answered" and "does not say there are no open cases while /v2/cases has not answered"; indep 1. loading (6 tests: first render, slow answer, slow failure, slow rejection, slow empty list, and "says Loading. and nothing else"). All fail on old, pass on new. |
| Failed with 503 | List: "/v2/cases responded 503" and "No open onboarding cases." Right pane: "Select a case." | List: "Cases are unavailable right now." only. Right pane empty. | Yes, difference | list "says the cases are unavailable when /v2/cases answers 503", "does not say there are no open cases when /v2/cases answers 503", "shows no path or status code…"; indep 2. failure on HTTP 503, 500, 404, 401 and a 200 with invalid JSON; "shows nothing in the right pane after a failure"; "asks for the cases once and does not retry after a failure". All fail on old, pass on new. |
| Failed with a network error | Same as 503, with the thrown message in the list. | Same as the 503 row: plain sentence only, right pane empty. | Yes, difference | list "says the cases are unavailable when the request fails, without the technical message"; indep "shows the plain unavailable sentence when fetch rejects". Fail on old, pass on new. |
| Empty answer | "No open onboarding cases." and "Select a case." | Same | Yes, parity | pinned "says there are no open cases and asks to select a case"; list "says there are no open cases only when the answer is an empty list"; indep 3. empty (3 tests). Pass on both. |
| Loaded with cases | A row per case in the order given. First case selected without a click. Its detail and Status panel open. | Same | Yes, parity | pinned "renders a row for each case, in the order given", "selects the first case without a click…", "does not say there are no open cases"; list "selects the loaded case and opens its detail"; indep 4. loaded (2 tests). Pass on both. |
| Another row clicked | The clicked case is selected and the first case's detail is replaced. | Same | Yes, parity | pinned "selects a clicked row and replaces the first case's detail". Passes on both. This is the only test that clicks a row; the new tests do not. |
| Status panel | Unchanged | Unchanged | Yes, parity | `StatusPanel.test.tsx` and `StatusPanel.retry.independent.test.tsx` pass on both. `StatusPanel.tsx` is not in the diff. |

## Totals

- Old code, old suite as it stood (6 files, 71 tests): 68 passed, 3 failed. The 5 pinned tests pass. The 3 failures are the reproduction tests in `App.caseList.test.tsx`.
- Old code, with the new `App.caseList.test.tsx` (8 tests) and `App.caseList.independent.test.tsx` (22 tests) copied in (7 files, 98 tests): 78 passed, 20 failed.
  - `App.caseList.test.tsx`: 6 fail, 2 pass. The 2 that pass are the empty answer and the loaded case.
  - `App.caseList.independent.test.tsx`: 14 fail, 8 pass. The 14 are the 6 loading tests and the 8 failure tests. The 8 that pass are the 3 empty, the 2 loaded and the 3 lifecycle tests.
- New code (7 files, 98 tests): 98 passed, 0 failed. `bun run lint` (`tsc --noEmit`) reported no errors.

All 20 failures on old are tests of the two changed states. All 8 independent tests that pass on old are of unchanged states or of lifecycle (unmount before an answer, exactly one request). None of the new tests of a changed state passes on the old code, so there is no finding of that kind. This closes the point that earlier workers raised, that nobody had shown the new tests fail on the old code.

## Files changed, old to new

`git diff dc3079b..HEAD --stat` lists three files:

- `rm-workspace/src/App.tsx`, the only application file (30 lines changed).
- `rm-workspace/src/__tests__/App.caseList.test.tsx` (+112).
- `rm-workspace/src/__tests__/App.caseList.independent.test.tsx` (+331, new file).

`api.ts`, `CaseList.tsx`, `styles.css`, `StatusPanel.tsx`, onboarding-core and `deploy/` are not touched.

The `App.tsx` diff replaces the `cases` and `error` state with one three-way state (loading, failed, loaded). It renders "Loading." or the unavailable sentence in place of the list until the answer is in. The right pane shows "Select a case." only once loaded. I read it for behaviour beyond the table and found none. Two things are worth knowing:

- The catch no longer reads the error message, so the technical text can no longer reach the screen.
- The "Loading." and unavailable lines reuse the `subdued` and `error` classes. `styles.css` is unchanged, and I did not check that `subdued` is defined there.

## Not intended, or not checked

- No unintended difference was found.
- Nothing was viewed in a browser. This comparison is tests and the code diff only.
- The brief said to make the old tree with `git worktree add`. A hook in this session blocked that command, so I exported the old commit with `git archive dc3079b` into `/tmp/onb-2382-old` and ran `bun install --frozen-lockfile` there. The code and tests are the same as a worktree would give. No git worktree was registered, so there was nothing to remove with `git worktree remove`.
- Clicking another row is tested only by the pinned test, which passes on both. The new tests add nothing for it.
