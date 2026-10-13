# ONB-2360 — Design: the case 18 test

Jira: ONB-2360 · Governs: `spec.md` (B1-B4, "The test must not", constraints 1-4) · Case: `test-plan.md` row 18

Read, not run. `rm-workspace/node_modules` does not exist until `bun install`, so nothing below has been executed yet.

## Context

Plan case 18 (ONB-2140 `plan.md:284`) says a status fetch failure renders inside the panel and leaves the case view intact. `StatusPanel.test.tsx` proves the panel half. Playwright `status-panel.spec.ts:92` proves the heading only. Nothing renders `CaseView` with the status failing and checks the rest of it.

As built:

- `CaseView({ onboardingCase })` takes one prop, a `CaseSummary`. It fetches nothing itself. Its only request is the one `StatusPanel` makes, `fetchCaseStatus(caseId)`, which is `GET /v2/cases/{caseId}/status`.
- `get()` throws on a non-OK answer, so a 500 and a rejected fetch end in the same failed state.
- `Panel` is a `<section class="panel">` with an `<h2 class="panel-title">`. It has no aria labelling, so a panel is found from its heading or from its content, not by role name.
- `held` and `inFlight` (`StatusPanel.tsx:132-133`) live for the whole test file. A failure is not stored, but a reused id that once succeeded would be.

## Files that change

| # | File | Change |
|---|---|---|
| 1 | `rm-workspace/src/__tests__/CaseView.statusFailed.test.tsx` | **New. The only file added.** One `describe("CaseView")`, one `it`. |

The name follows the sibling convention `<Component>.<aspect>.test.tsx` (`StatusPanel.retry.independent.test.tsx`, `App.caseList.test.tsx`). It matches the vitest `include` (`src/**/*.{test,spec}.{ts,tsx}`) and is covered by `tsc --noEmit` (`include: ["src"]`).

**Stays untouched:** every production file (`CaseView.tsx`, `StatusPanel.tsx`, `api.ts`, `Panel.tsx`, `formatting.ts`, `session.ts`), every existing test, `vite.config.ts`, `package.json`, `bun.lock`, `tsconfig.json`, the e2e folder, and everything under `docs/changes/` apart from this folder. No helper is extracted from `StatusPanel.test.tsx`; the new file inlines what it needs (about ten lines) so no existing test is edited.

## The test

**Fixture** (all invented, none copied from `local-data.sql` or the registry samples; `CaseSummary` has no person fields):

```ts
const CASE_ID = "ONB-2026-000830";
const summary: CaseSummary = {
  caseId: CASE_ID,
  orgNo: "5569990123",
  legalName: "Tallbacken Marin AB",
  lifecycleStatus: "DOCS_RECEIVED",
  openedAt: "2026-09-01T08:00:00Z",
  updatedAt: "2026-09-10T08:00:00Z",
  documentsOutstanding: 3,
};
```

The case id is `ONB-2026-000830`. I grepped `src/` and `e2e/`: `000801-000824`, `000901`, `00095x`, `004112`, `004133` and `0090xx` are taken, and `000825-000899` is free. It is used by this file only.

**The failing fetch.** `CaseView` makes one request, so a single stub covers it, but it routes on the URL so that any other request still succeeds:

```ts
const fetcher = vi.fn(async (input: RequestInfo | URL) =>
  String(input).endsWith("/status")
    ? new Response("", { status: 500 })
    : new Response(JSON.stringify(summary), { status: 200, headers: { "content-type": "application/json" } }),
);
vi.stubGlobal("fetch", fetcher);
```

`afterEach(() => vi.unstubAllGlobals())`, as the sibling tests do. Testing Library's auto-cleanup is on (globals are on).

**Flow.**

1. `render(<CaseView onboardingCase={summary} />)`.
2. Wait for the failure with `await screen.findByRole("button", { name: "Try again" })`, then `await settle()`, the sibling idiom: one `act` plus `setTimeout(0)`. The settle matters because B2 and B4 are absences, and an absence is only meaningful after everything that was going to happen has happened.
3. Assert.

**Assertions.** Each query avoids the stage and next-step wording (`formatting.ts:37-53`), and only the failure sentence, the "Try again" name and the panel and term names that the spec itself fixes are literal.

| Req | Assertion | How it avoids pinning label wording |
|---|---|---|
| B1 | `button = getByRole("button", { name: "Try again" })`, with `getAttribute("type") === "button"`. `statusPanel = button.closest("section")`. `within(statusPanel).getByRole("heading", { level: 2 }).textContent === "Status"`. `within(statusPanel).getByText("Status is unavailable right now.")` is defined. | The panel is found from its button, not from a text search for "Status". "Status" is also a `dt` in the Case panel, so a text query for it would be ambiguous. |
| B2 | (a) `statusPanel.textContent === "Status" + "Status is unavailable right now." + "Try again"`. That is the strongest absence check: nothing else is in the panel, so no Loading, no term, no code, no technical text, with no wording list to maintain. (b) Named checks for readable failure messages: `within(statusPanel).queryByText("Loading.")`, `queryByText(/^(Stage\|Next step\|Expected date)$/)`, `statusPanel.querySelector("dl, .procedure-code")` all `null`/`toBeNull()`. (c) `statusPanel.textContent` does not match `/500\|responded\|\/v2\|status\//i`. | Only the fixed term names and "Loading." are literal, and they are asserted absent. No stage or next-step label is read or written. Hygiene excludes `STAGES`, `NEXT_STEPS` and the label helpers. |
| B3 | Heading: `getByRole("heading", { level: 1 })` has text `Tallbacken Marin AB`. The case line: `getByText("ONB-2026-000830 · 556999-0123")`, taken from the `<p>`. The Case panel is found with `getByRole("heading", { level: 2, name: "Case" }).closest("section")`. Inside it: `"2026-09-01"`, `"2026-09-10"`, `"3"`, and the lifecycle value. The Contacts panel is found with `getByRole("heading", { level: 2, name: "Contacts" })`. Its `<p>` is checked as non-empty text, not by sentence. | Dates and org number are literals, not computed by `formatDate` and `formatOrgNo`, so a formatter regression shows. The lifecycle value is `lifecycleLabel(summary.lifecycleStatus)` imported from `shared/formatting`. That is not a stage or next-step label and it avoids hardcoding "In progress", but it means that one value is checked against the code's own mapping. I accept that. The Contacts sentence is brand copy, so it is only required to be there. |
| B4 | `expect(fetcher).toHaveBeenCalledTimes(1)` and `expect(String(fetcher.mock.calls[0][0])).toBe("/v2/cases/ONB-2026-000830/status")`, both **after** the settle. | Nothing to do with wording. A second request (a retry, a refetch) would show up in the count. |

The case id and path appear once, as `CASE_ID`; the expected path is built from it.

**Isolation from `held` / `inFlight`.** By a unique id: `ONB-2026-000830` is used by this test and no other, and the test file runs in its own module registry (vitest isolates files by default), so nothing from other files carries over. `vi.resetModules()` is not needed, and is not used, because `CaseView` and `StatusPanel` are imported statically and re-importing them would split the module from the one the render uses. The same failure is never stored in `held` (the code keeps only successes), so even this test's own state is clean on a re-run.

**Not included:** a second `it` for a rejected fetch. The spec calls it a second case of the same behaviour, and the brief says the change is one test. If wanted, it is a separate id (`ONB-2026-000831`) and one `mockRejectedValue`.

Typing: no `any`; `Response` and `vi.fn` typed as in `App.pinned.test.tsx`; `toBeDefined()`, not `jest-dom`. `fetcher.mock.calls[0][0]` is `unknown`-safe through `String(...)`. `noUnusedLocals` is on, so import only what is used.

## Order of work

1. Confirm `.claude/fix-task.marker` is absent (C3). If it exists, the hook blocks a new `*.test.tsx` and the step stops.
2. `cd rm-workspace && bun install --frozen-lockfile` (needed before anything can run).
3. Write the one file.
4. `bun run lint`, then `bun run test`. Both must be green.
5. Check the test can fail: temporarily make one assertion wrong in a scratch copy (not in the committed file), or reason from B4 that a second request would fail the count. At minimum run it once with the stub returning 200 and see B1 fail. Remove the scratch afterwards. This is for the report, not for the repository.
6. Report.

## Risks

1. **Nothing in the built code makes B1-B4 unprovable as written.** I checked each against `CaseView.tsx` and `StatusPanel.tsx`. B2 "no procedure code" holds trivially for a 500 (the code is never available). It is covered by the whole-text equality in B2(a), not by looking for a particular code, and I flag that the fixture does not put a code anywhere it could leak.
2. **Pass on a first run is unverified.** Not run (no `node_modules`). If the test fails against the built code, the fault goes into `docs/changes/ONB-2360/` as a note for a new issue and the test file is removed from the change. It is not skipped, not marked known-failing, and no production file is fixed (spec C2, constraint 4).
3. **B2(a) is strict on purpose.** If the failure markup gets an icon, a heading change or another copy edit, the equality fails. That is the point of case 18, but it will fail on a copy approval too. The sentence is in `StatusPanel.tsx` and in two existing tests already.
4. **"Status" is ambiguous.** The `dt` "Status" in the Case panel shares the word with the panel title, so no query may find the panel by text. The design finds it by the button.
5. **Module state across tests in this file.** One `it` means no cross-test leakage. Adding a second `it` later requires a new id.
6. **Test lock (C3):** a later step under `bin/fix-task begin` would block the file. Not a conflict today.
7. **Not covered:** the Playwright half of case 18, and the done check does not run Java.

## Tests

The deliverable is the test. `test-plan.md` row 18 is "written here" and points at this file by name once it exists. No other test is added, edited or skipped.

## Verification

Done check, from the repository root of this worktree (Where: any terminal in `rm-workspace`'s parent):

```
cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test
```

Paste the output. Say plainly in the report that `make build`, `make test` and `make lint` were **not run**: there is no JDK 21 here and `check-java` exits 1 (spec C1, decided 2026-10-13). Say also that Java cases 1-13 and Playwright were not run.
