# ONB-2382 code map: the case list in the RM workspace

Read-only survey of the repository on 2026-10-13, branch `loop/ONB-2382-run-17`. Every line number below was checked against the files. Nothing was run: `rm-workspace/node_modules` does not exist in this worktree, so neither `bun run lint` nor `bun run test` has been executed.

## 1. Structure

The whole path lives in `rm-workspace/src`. Only the front end is involved. onboarding-core (`CaseQueryController`, `GET /v2/cases`) is out of scope and unchanged.

- `main.tsx` mounts `<App />` inside `React.StrictMode`. In dev, StrictMode runs the effect twice, so `/v2/cases` is requested twice. Both answers are the same.
- `App.tsx:7-47` holds the state: `cases` (default `[]`, line 9), `selectedCaseId` (line 10), `error` (`string | null`, line 11). It also calls `currentSession()` on line 8 for the masthead.
- `App.tsx:13-20` is the single `useEffect`. It calls `fetchCases()`. On success it calls `setCases(loaded)` and `setSelectedCaseId((current) => current ?? loaded[0]?.caseId ?? null)`. On failure it calls `setError(failure.message)` (line 19).
- `App.tsx:37` renders `<p className="error">{error}</p>` when `error` is set. Line 38 always renders `<CaseList>`. Line 42 renders `<CaseView>` for the selected case, otherwise `<p className="empty">Select a case.</p>`.
- `onboarding/api.ts:26-32` is the private `get<T>()`. It calls `fetch(path, { headers: sessionHeaders(currentSession()) })` and throws `Error(`${path} responded ${status}`)` on a non-OK answer. `fetchCases()` (lines 34-36) is `get("/v2/cases")`. `fetchCase()` and `fetchCaseStatus()` use the same `get()`. Nothing in the repository calls `fetchCase()`.
- `onboarding/CaseList.tsx:11-12` returns `<p className="empty">No open onboarding cases.</p>` for any empty array. Otherwise it renders the table. It takes only `cases`, `selectedCaseId` and `onSelect`, so it cannot tell "empty" from "not loaded".
- `onboarding/CaseView.tsx` renders the detail pane and mounts `StatusPanel`.
- `onboarding/StatusPanel.tsx` already has the wording this issue wants for the list. Failed (lines 14-22): "Status is unavailable right now." in `.error`, plus a "Try again" button. Loading (lines 24-31): "Loading." in `.subdued`. Module-level `held` and `inFlight` maps are at lines 132-133. The panel is out of scope.
- `styles.css:46-48` defines `.subdued`, `.empty` (subdued, italic) and `.error` (`#a4262c`).

## 2. Behaviour today

| State | Left list | Right pane |
|---|---|---|
| Before load (every page open) | "No open onboarding cases." (`cases` is `[]`) | "Select a case." |
| Loaded with cases | table; first case selected | `CaseView` of the first case |
| Loaded, empty array | "No open onboarding cases." (correct here) | "Select a case." |
| Failed (503, network error) | red `/v2/cases responded 503`, then "No open onboarding cases." | "Select a case." |

A failure that is not an HTTP status shows the browser's own message the same way, for example `Failed to fetch`. So does a bad JSON body. The code only knows `error` is a string. There is no loading flag and no way to tell "answered with nothing" from "not answered".

## 3. Risks

1. **First-case selection.** The `current ?? loaded[0]?.caseId ?? null` rule (App.tsx:17) must keep working: success selects the first case and the right pane opens it. Any change that gates the list on a new state must still set `cases` and `selectedCaseId` in the same success callback. Otherwise there is one frame with a list and no selection.
2. **Shared `get()`.** The "responded 503" text comes from `get()`, which also serves the Status panel. The panel never shows the message. It only catches the rejection and shows its fixed sentence. Changing the thrown message or the error type affects both. Unit tests only look at status codes through stubbed `fetch`; I found no assertion on the message text anywhere.
3. **StatusPanel module state in an App test.** A rendered `App` that loads cases mounts `CaseView`, then `StatusPanel`, which fetches `/v2/cases/{id}/status` through the same stubbed `fetch`. `held` and `inFlight` live for the whole test file and are not cleared between tests. A second test reusing a case id gets the cached status and makes no request. Use distinct case ids per test, or `vi.resetModules()`. The status request must be answered by the stub too, or the panel shows its own failure.
4. **`currentSession()`.** `src/auth/session.ts:25` reads `globalThis.__NORRBANK_SESSION__` and falls back to the built-in dev identity (Sofia Lundin, "Corporate Banking, Stockholm"). A test needs no session setup. Both `App` (line 8) and `get()` call it.
5. **Other consumers of `CaseList` and the sentence.** `CaseList` is used only by `App.tsx:38` and `__tests__/CaseList.test.tsx`. That test has two cases: rows render (line 20), and an empty array shows "No open onboarding cases." (lines 27-28). Searching the whole repository for the sentence, "responded" and "Select a case" found hits only in `CaseList.tsx`, `CaseList.test.tsx`, `App.tsx` and `api.ts`.
   - `rm-workspace/e2e/status-panel.spec.ts` (Playwright) stubs `**/v2/cases` with 200 (line 52). It never asserts on the sentence or on a failed case list.
   - `rm-workspace-e2e` (Selenium, Java): **checked, it does not assert on the sentence.** `CaseListSeleniumTest` checks column headings, row count, cell text and selection. `WorkspaceStubServer.java:91` answers anything starting with `/v2/cases` with the same cases and status 200. It never returns an error or an empty list.
   - That same prefix match means the Selenium stub also answers `/v2/cases/{id}/status` with the case array. The status panel there is not what the suite tests. Noted, not part of this issue.
   - It is not run by `make test`. It needs `bun run build` first, then `./mvnw -B -f rm-workspace-e2e/pom.xml -Pe2e test`.
6. **No test renders `App`.** The new behaviour (loading, failed, loaded-empty, first-case open) has no coverage at the level where it lives.
7. **Test-lock hook.** `.claude/hooks/test-lock.sh` exists and is wired in `.claude/settings.json`. It blocks edits under `src/test/`, `src/itest/` and to `*.test.ts` and `*.test.tsx` only while `.claude/fix-task.marker` exists. `bin/fix-task begin` creates the marker and `end` removes it. The marker is **not present now**. If a later step runs under a fix task, new test files in `rm-workspace/src/__tests__/` will be blocked. `*.spec.ts` in `e2e/` is not named by the hook.
8. **Conventions to respect.** TypeScript strict, no `any` (`rm-workspace/CLAUDE.md`). Presentation formatting in `shared/formatting.ts`. The `ux-workspace` skill (v1.1) §5 requires loading, empty and failed for every panel, loading without layout shift, and no technical error shown. The `brand` skill (v3.2) §3 says no full stop on a label or single-line value, while §5 says an error says what to do next. The sentences in the issue end with a full stop, as does the existing "Status is unavailable right now." This is a possible conflict for the spec; I did not resolve it.

## 4. Unknowns

- Whether the gateway or `deploy/` routes return anything other than a plain status for `/v2/cases` (an HTML error page, say). I did not read the gateway config. The front end would show `responded <status>` in any case.
- Whether any consumer outside this repository reads the text "No open onboarding cases." (RM support scripts, training material). Not findable from the code.
- Whether the Selenium suite is run in the pipeline for every change. `.github/` was not read.
- `bun run lint` and `bun run test` baselines are unknown, since dependencies are not installed here.

## 5. Build and test

Where: a terminal in `rm-workspace/`. Run `bun install` first (not done). Then `bun run lint` (`tsc --noEmit`, must be clean) and `bun run test` (`vitest run`, happy-dom, `globals: true`, includes only `src/**/*.{test,spec}.{ts,tsx}`). The repository root also has `make build`, `make test` and `make lint`, which `CLAUDE.md` requires before reporting a task complete. `bun run test:e2e` is Playwright and is separate. Do not run it by accident through vitest; the config excludes `e2e/`.

Simulating `/v2/cases` in vitest, using the same approach as `StatusPanel.test.tsx`:

- **Slow:** `vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})))` never answers. For a controlled delay, keep the `resolve` function of a deferred promise and call it inside `act`. Then use `waitFor` or `findBy*` for what follows.
- **Failing:** `vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }))`. For a network failure use `mockRejectedValue(new TypeError("Failed to fetch"))`.
- **Loaded:** `{ ok: true, status: 200, json: async () => cases }`. For loaded-empty, use `[]`.
- Route on the URL when the first case opens, since the status request goes through the same stub. Restore with `vi.unstubAllGlobals()` in `afterEach`.
