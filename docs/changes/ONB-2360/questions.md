# ONB-2360 questions: what must be answered before this is a firm ask

Issue: "Test — ONB-2140 status panel: the suites test-plan.md names, one case each, committed with the plan at the head of the Test stage."

Answer each in one line under "Answer:". Evidence is from `code-map.md` (sections 1.2, 3, 4, 6) and `docs/changes/ONB-2140/plan.md:253-292`.

---

## 1. What is the test plan?

No `test-plan.md` exists anywhere in the repository. The nearest list is "Tests that prove it", `docs/changes/ONB-2140/plan.md:253-292`: 23 cases, of which 16 are covered by existing tests, 3 partly and 4 not (code-map section 3).

- **A.** Someone supplies `test-plan.md`. This run waits for it and tests what it names.
- **B.** This run writes `docs/changes/ONB-2360/test-plan.md` from plan.md:253-292, corrected by the code map where the plan and the built code differ. You approve it before any test is written.

Answer:

## 2. What does "one case each" mean?

The issue says "the suites test-plan.md names, one case each". plan.md names 3 suites (screening-batch, onboarding-core, rm-workspace) plus the cache tests, and lists 23 cases.

- **A.** One new case per suite named: about 4 new tests in total.
- **B.** One test per case the plan lists: the 23 cases, with the gaps filled.

Answer:

## 3. Which layers are in scope?

The platform check runs only `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test` (vitest and `tsc`). The 13 backend cases (plan cases 1-13) sit in Java suites that check never runs, and there is no `java` or `JAVA_HOME` in this worktree. Playwright and Selenium are not run by it either (code-map section 4).

- **A.** Vitest only. Java, Playwright and Selenium cases are listed in the plan but not written here.
- **B.** Vitest plus Java unit and integration tests. Say where Java is run and how its result is shown, since this worktree cannot run it. The Java tests would be written but unrun here.
- **C.** Everything, including Playwright and Selenium. Same question for where they run.

Answer:

## 4. Cache expiry: what happens to plan cases 20 and 21?

The panel cache `held` at `rm-workspace/src/onboarding/StatusPanel.tsx:132` never expires, and there is no `statusCache.ts`. A test that an entry fetched at 01:50 is not served at 02:06, or that one fetched at 09:00 is not served at 09:31, cannot pass against today's code.

- **A.** Add the expiry to production code in this issue. That is more than a tests-only task, and it needs its own spec decisions (the 02:05 Europe/Stockholm boundary, the 30-minute ceiling).
- **B.** Drop the two cases and record that the cache has no expiry.
- **C.** Write them as known-failing tests that name the missing expiry.

Answer:

## 5. Plan or built behaviour: which is the contract the tests pin?

They differ in four places (code-map 1.2):
- The DTO `stage` is the enum name, with the procedure code in `procedureStageCode`. The plan said `stage` is the code (plan.md:106).
- A missing `case_stage` row gives `SCREENING_IN_PROGRESS` with a screening date. The plan said null and "Not yet assessed" (plan.md:123).
- Date precedence: the code shows a registry date only at `AWAITING_REGISTRY_EVIDENCE`. `case_stage.expected_decision_date` is never read by onboarding-core. The plan said registry first, otherwise the screening date (plan.md:112).
- With `REGISTRY_COMPLETE` the code shows no date. The plan wanted the screening date.

- **A.** The code is the contract. Tests pin built behaviour, and the differences are recorded as accepted.
- **B.** The plan is the contract. Tests follow the plan and fail where the code differs, and the failures are then handled under question 6.
- **C.** Decide per difference. Say which, and give the answer to "does `REGISTRY_COMPLETE` show a screening date?" as part of it.

Answer:

## 6. If a new test exposes a fault in production code, does this run fix it?

Question 5 option B, and question 4 option A, would both produce failing tests against production code.

- **A.** Fix it in this run. Production code changes are in scope.
- **B.** Record it in `docs/changes/ONB-2360/` for a new issue, and leave the test skipped or known-failing.

Answer:

## 7. Is the label copy approved, so tests may pin its wording?

`rm-workspace/src/shared/formatting.ts:37-53` is filled in, including "We are verifying the owners". The plan said the copy would ship as placeholders that fail a test. Nothing in the repository records approval by E. Sandberg.

- **A.** Approved. Tests assert the exact wording.
- **B.** Not approved. Tests assert only that every code has a non-fallback label, and never the wording itself.

Answer:

## 8. Do the 16 already-covered cases get new tests?

Code-map section 3 finds 16 cases already covered by existing tests, and 3 partly covered. Examples of the partial ones are the next step for five of six stages, and a failed fetch leaving the case view intact, which is Playwright only.

- **A.** Gaps only. Write tests for the 4 uncovered and 3 partly covered cases, and cite the existing test for the other 16.
- **B.** Every case gets a test written under this issue, even where one already exists.

Answer:

## 9. Are plan cases 5 and 6 (stage file unchanged, failing table write) worth a change to `ScreeningBatchJob`?

Nothing tests `ScreeningBatchJob.run`. The effort is unknown: `run` needs a database with the case, party and result tables and a `ScreeningListProvider`, and `CaseReader` and `ResultWriter` were not read (code-map 6.5). If `run` cannot be tested as it stands, a small refactor of production code would be needed. These two cases also fall under question 3, since they are Java and cannot be run here.

- **A.** Test `run` as it is, with whatever database and provider fixtures that takes.
- **B.** Allow a small change to `ScreeningBatchJob` to make `run` testable.
- **C.** Leave cases 5 and 6 uncovered and record why.

Answer:
