# Spec: a test plan for the ONB-2140 status panel, and its one front-end gap closed

From intent.md (ONB-2360). Accepted by William Kull, Onboarding platform, 2026-10-13.

Jira: ONB-2360
Skills in force: brand@3.2 · ux-workspace@1.1 · aml-compliance@2.0

## Outcome

An approved `docs/changes/ONB-2360/test-plan.md` says, for each of the 23 cases in
`docs/changes/ONB-2140/plan.md:253-292`, which test covers it or why none does. One new
vitest test closes plan case 18: when the status cannot be fetched, the failure shows inside
the panel and the rest of the case view is still there.

## What test-plan.md must contain

T1. All 23 plan cases, numbered as in `plan.md`, none merged and none missing.
T2. For each case: its layer (Java unit, Java integration, vitest, Playwright), and its
    status, one of:
    - **cited**: file and test name of the existing test;
    - **written here**: the new test, file and name;
    - **left out**: the reason.
T3. Cited cases: 1-4, 9-13 (Java, cited, not run here), 14-17, 19, 22 and 23 (vitest). Cases 9
    and 12 are marked "as built" (see T5).
T4. Left out, with the reason given in intent.md: 5 and 6 (`ScreeningBatchJob.run` has no test and
    would need a database fixture or a production change; Java cannot run here); 7 and 8 (Java
    gaps, partly covered, not written under vitest-only); 20 and 21 (the cache has no expiry,
    `StatusPanel.tsx:132`, so the cases cannot pass). Written here: 18 only.
T5. The four accepted differences between plan and code, each as "plan said / code does":
    the DTO `stage` is the enum name and the code is `procedureStageCode`; a case with no
    `case_stage` row is `SCREENING_IN_PROGRESS` with a screening date, not null; the registry
    date shows only at `AWAITING_REGISTRY_EVIDENCE`; `REGISTRY_COMPLETE` shows no date.
T6. What the platform check runs and does not: it runs `bun run lint` (`tsc --noEmit` over `src/`,
    tests included) and `bun run test` (the 7 files in `src/__tests__/`). It does not run Java
    (cases 1-13), Playwright (the e2e half of case 18), Selenium, or `bun test platform/`. A green
    check says nothing about cases 1-13.
T7. The risks carried forward in intent.md: no cache expiry (stale after 02:00); the check does
    not run the backend; cases 7 and 8 stay partly covered and the built date rule is pinned by
    nothing new.
T8. No label wording from `shared/formatting.ts:37-53` and no beneficial-owner or director name.

## The case 18 test

Read from `CaseView.tsx` and `StatusPanel.tsx` as built. `CaseView` fetches nothing itself: its
only request is the one `StatusPanel` makes, `GET /v2/cases/{caseId}/status`
(`fetchCaseStatus`). Both a non-OK answer and a rejected fetch end in the same state.

**Given** `CaseView` rendered with a `CaseSummary` and a stubbed `fetch` that fails the status
request (a 500 `Response`; a rejected fetch is a second case of the same behaviour),
**when** the failure has settled,
**then**:

B1. **In the panel.** The section titled "Status" (`h2.panel-title`) contains the sentence
    "Status is unavailable right now." and a button named "Try again" (`type="button"`).
B2. **Nothing else in the panel.** It has no "Loading.", no Stage, Next step or Expected date
    term, no procedure code, and no technical text (no "responded 500", no path, no status code).
    That the failure is a plain sentence is ux-workspace §5 and brand §5.
B3. **The rest of the case view stays.** On screen:
    - the heading (`h1`) with the legal name, and the case id with the formatted organisation
      number;
    - the "Case" panel: lifecycle label, opened date, last updated date, and the documents
      outstanding count, each with the value from the summary;
    - the "Contacts" panel with its sentence.
B4. **Request.** Exactly one request was made, to the status path of that case id.

The test must not:

- assert the wording of any stage or next-step label, only that the failure sentence is
  there and the Stage, Next step and Expected date terms are not;
- use a name of a beneficial owner or director anywhere in the fixture. `CaseSummary` has no
  such field. The legal name and organisation number are made up and not copied from
  `local-data.sql` or the registry samples;
- reuse a case id from another test. `held` and `inFlight` (`StatusPanel.tsx:132-133`) live for
  a whole test file, so a reused id gets the cached status and makes no request. Use one id of
  the `ONB-2026-0008xx` kind that no other test uses, or `vi.resetModules()`.

## Constraints

1. No production file changes. The change is `test-plan.md`, `spec.md`, the design document, and
   one test file under `rm-workspace/src/__tests__/`. Nothing in another issue's folder under
   `docs/changes/` is edited.
2. Existing tests are not edited, weakened, skipped or deleted. Only case 18 is new.
3. The test is picked up by vitest (`src/**/*.{test,spec}.{ts,tsx}`, happy-dom) and passes under
   `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test`.
   No `any`; `toBeDefined()`, not `jest-dom`.
4. The built code is the contract. A fault the test exposes is recorded in
   `docs/changes/ONB-2360/` for a new issue and is not fixed here.
5. `test-plan.md` is approved by William Kull before any test is written.

## Areas of concern

### C1 · Contradicting policies — the done check against a worktree with no Java

Root `CLAUDE.md:19-23` requires `make build`, `make test` and `make lint` before any task is
reported complete, with the output pasted. `Makefile:16-19` makes all three depend on
`check-java`, which exits 1 without `JAVA_HOME` or `java` on `PATH`. Neither is set in this
worktree, so none of the three can pass here, and `make lint` runs only `tsc --noEmit`.
The intent's own done check is the front-end command in constraint 3.

**Open.** Options: run the three `make` targets on a machine with a JDK 21 and paste that
output; report the front-end command as the check and say plainly that `make` was not run; or
change `CLAUDE.md` to name the front-end command for tests-only changes.

### C2 · Contradicting policies — "never skip a failing test" against "leave the test skipped"

`CLAUDE.md:20` says never skip or delete a failing test. Answer 6B in `questions.md` says a
test that exposes a fault stays "skipped or known-failing" while the fault is recorded.
Case 18 is expected to pass against the built code, so this arises only if it does not.

**Open.** Options: no test is skipped, and a failing case 18 is recorded and left out of the
change; skip it with a reference to the new issue, with William Kull waiving `CLAUDE.md:20`
for that test; or hold the run until the fault is fixed.

### C3 · Test lock

`.claude/hooks/test-lock.sh` blocks new and edited `*.test.tsx` files while
`.claude/fix-task.marker` exists. It is absent now, so nothing is blocked. If a later step
runs under `bin/fix-task begin`, the new test file cannot be written. Not a conflict today.

### C4 · Scope: one test, not about four

Answer 2A asked for about four new tests, one per suite; answers 3A, 4B and 9C leave one.
Intent.md records William Kull approving one test. No test is written for the other suites.

## Out of scope

- Cases 5, 6, 7 and 8: Java gaps. Java cannot run in this worktree, and 5 and 6 need
  `ScreeningBatchJob.run` under test.
- Cases 20 and 21: the cache has no expiry. A new issue adds it and then writes them.
- Java, Playwright and Selenium tests: listed in `test-plan.md`, not written.
- Any production code change, including cache expiry, label copy approval and the stale
  `screening-batch/CLAUDE.md`.
- Rewriting the existing tests for cases 14-17, 19, 22 and 23.
