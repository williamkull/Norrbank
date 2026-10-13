# ONB-2360 questions: what must be answered before this is a firm ask

Issue: "Test — ONB-2140 status panel: the suites test-plan.md names, one case each, committed with the plan at the head of the Test stage."

Answer each in one line under "Answer:". Evidence is from `code-map.md` (sections 1.2, 3, 4, 6) and `docs/changes/ONB-2140/plan.md:253-292`.

---

## 1. What is the test plan?

No `test-plan.md` exists anywhere in the repository. The nearest list is "Tests that prove it", `docs/changes/ONB-2140/plan.md:253-292`: 23 cases, of which 16 are covered by existing tests, 3 partly and 4 not (code-map section 3).

- **A.** Someone supplies `test-plan.md`. This run waits for it and tests what it names.
- **B.** This run writes `docs/changes/ONB-2360/test-plan.md` from plan.md:253-292, corrected by the code map where the plan and the built code differ. You approve it before any test is written.

Answer: B. This run writes `docs/changes/ONB-2360/test-plan.md` from plan.md:253-292, corrected by the code map where the plan and the built code differ. You approve it before any test is written. (William Kull, 2026-10-13)

## 2. What does "one case each" mean?

The issue says "the suites test-plan.md names, one case each". plan.md names 3 suites (screening-batch, onboarding-core, rm-workspace) plus the cache tests, and lists 23 cases.

- **A.** One new case per suite named: about 4 new tests in total.
- **B.** One test per case the plan lists: the 23 cases, with the gaps filled.

Answer: A. One new case per suite named: about 4 new tests in total. (William Kull, 2026-10-13)

## 3. Which layers are in scope?

The platform check runs only `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test` (vitest and `tsc`). The 13 backend cases (plan cases 1-13) sit in Java suites that check never runs, and there is no `java` or `JAVA_HOME` in this worktree. Playwright and Selenium are not run by it either (code-map section 4).

- **A.** Vitest only. Java, Playwright and Selenium cases are listed in the plan but not written here.
- **B.** Vitest plus Java unit and integration tests. Say where Java is run and how its result is shown, since this worktree cannot run it. The Java tests would be written but unrun here.
- **C.** Everything, including Playwright and Selenium. Same question for where they run.

Answer: A. Vitest only. Java, Playwright and Selenium cases are listed in the plan but not written here. (William Kull, 2026-10-13)

## 4. Cache expiry: what happens to plan cases 20 and 21?

The panel cache `held` at `rm-workspace/src/onboarding/StatusPanel.tsx:132` never expires, and there is no `statusCache.ts`. A test that an entry fetched at 01:50 is not served at 02:06, or that one fetched at 09:00 is not served at 09:31, cannot pass against today's code.

- **A.** Add the expiry to production code in this issue. That is more than a tests-only task, and it needs its own spec decisions (the 02:05 Europe/Stockholm boundary, the 30-minute ceiling).
- **B.** Drop the two cases and record that the cache has no expiry.
- **C.** Write them as known-failing tests that name the missing expiry.

Answer: B. Drop the two cases and record that the cache has no expiry. (William Kull, 2026-10-13)

## 5. Plan or built behaviour: which is the contract the tests pin?

They differ in four places (code-map 1.2):
- The DTO `stage` is the enum name, with the procedure code in `procedureStageCode`. The plan said `stage` is the code (plan.md:106).
- A missing `case_stage` row gives `SCREENING_IN_PROGRESS` with a screening date. The plan said null and "Not yet assessed" (plan.md:123).
- Date precedence: the code shows a registry date only at `AWAITING_REGISTRY_EVIDENCE`. `case_stage.expected_decision_date` is never read by onboarding-core. The plan said registry first, otherwise the screening date (plan.md:112).
- With `REGISTRY_COMPLETE` the code shows no date. The plan wanted the screening date.

- **A.** The code is the contract. Tests pin built behaviour, and the differences are recorded as accepted.
- **B.** The plan is the contract. Tests follow the plan and fail where the code differs, and the failures are then handled under question 6.
- **C.** Decide per difference. Say which, and give the answer to "does `REGISTRY_COMPLETE` show a screening date?" as part of it.

Answer: A. The code is the contract. Tests pin built behaviour, and the differences are recorded as accepted. (William Kull, 2026-10-13)

## 6. If a new test exposes a fault in production code, does this run fix it?

Question 5 option B, and question 4 option A, would both produce failing tests against production code.

- **A.** Fix it in this run. Production code changes are in scope.
- **B.** Record it in `docs/changes/ONB-2360/` for a new issue, and leave the test skipped or known-failing.

Answer: B. Record it in `docs/changes/ONB-2360/` for a new issue, and leave the test skipped or known-failing. (William Kull, 2026-10-13)

*Superseded in part, 2026-10-13: the "skipped or known-failing" wording is replaced by spec C2. No test is skipped or marked known-failing; a case 18 test that fails is left out of the change and the fault is recorded.*

## 7. Is the label copy approved, so tests may pin its wording?

`rm-workspace/src/shared/formatting.ts:37-53` is filled in, including "We are verifying the owners". The plan said the copy would ship as placeholders that fail a test. Nothing in the repository records approval by E. Sandberg.

- **A.** Approved. Tests assert the exact wording.
- **B.** Not approved. Tests assert only that every code has a non-fallback label, and never the wording itself.

Answer: B. Not approved. Tests assert only that every code has a non-fallback label, and never the wording itself. (William Kull, 2026-10-13)

## 8. Do the 16 already-covered cases get new tests?

Code-map section 3 finds 16 cases already covered by existing tests, and 3 partly covered. Examples of the partial ones are the next step for five of six stages, and a failed fetch leaving the case view intact, which is Playwright only.

- **A.** Gaps only. Write tests for the 4 uncovered and 3 partly covered cases, and cite the existing test for the other 16.
- **B.** Every case gets a test written under this issue, even where one already exists.

Answer: A. Gaps only. Write tests for the 4 uncovered and 3 partly covered cases, and cite the existing test for the other 16. (William Kull, 2026-10-13)

## 9. Are plan cases 5 and 6 (stage file unchanged, failing table write) worth a change to `ScreeningBatchJob`?

Nothing tests `ScreeningBatchJob.run`. The effort is unknown: `run` needs a database with the case, party and result tables and a `ScreeningListProvider`, and `CaseReader` and `ResultWriter` were not read (code-map 6.5). If `run` cannot be tested as it stands, a small refactor of production code would be needed. These two cases also fall under question 3, since they are Java and cannot be run here.

- **A.** Test `run` as it is, with whatever database and provider fixtures that takes.
- **B.** Allow a small change to `ScreeningBatchJob` to make `run` testable.
- **C.** Leave cases 5 and 6 uncovered and record why.

Answer: C. Leave cases 5 and 6 uncovered and record why. (William Kull, 2026-10-13)

---

## The firm ask

The test plan is `docs/changes/ONB-2360/test-plan.md`, which this run writes from `docs/changes/ONB-2140/plan.md:253-292` and corrects with the code map where the plan and the built code differ. William Kull approves it before any test is written. No `test-plan.md` is supplied from outside.

"One case each" means one new test for each suite the plan names. The plan lists 23 cases. Cases that an existing test already covers get no new test: the plan cites the existing test instead. Only the gaps get a test.

Only vitest in `rm-workspace` is in scope. Java, Playwright and Selenium cases stay in the plan and are not written here. The Java gaps (cases 5, 6, 7 and 8) are listed in the plan as not covered and are not written. Cases 5 and 6 are left uncovered on purpose, and the plan records why: `ScreeningBatchJob.run` would need a database fixture or a change to production code, and Java cannot run in this worktree. Cases 20 and 21 are dropped, and the plan records that the panel cache has no expiry (`held` in `StatusPanel.tsx:132`).

The one vitest gap left is case 18: a status fetch failure renders inside the panel and leaves the rest of the case view intact, tested by rendering `CaseView` with a failing status. Cases 14 to 17, 19, 22 and 23 are covered by existing vitest tests and are cited, not rewritten.

The tests pin what the code does today, not what the plan said. The four differences (the DTO `stage` value, the no-row answer, date precedence, and no date at `REGISTRY_COMPLETE`) are recorded in the test plan as accepted. Label tests assert only that each code has a non-fallback label, never the wording, because the copy is not approved.

No production code changes. If a test exposes a fault, the run records it in `docs/changes/ONB-2360/` for a new issue and leaves the test skipped or known-failing (superseded by spec C2, 2026-10-13: no test is skipped or marked known-failing). It does not fix the fault here.

## Conflicts for a person

Decided by William Kull, 2026-10-13, as policy conflicts C1 (the done check is the front-end command; make is not run) and C2 (no test is skipped or known-failing) in `spec.md`. They are no longer open. The recorded answers below are unchanged.

1. **Answer 2A (about 4 new tests, one per suite) against answers 3A and 8A.**
   - 8A says to write tests for the 4 uncovered and 3 partly covered cases. 3A ("Vitest only, no production code changes") excludes the Java cases among them (5, 6, 7, 8). 4B drops 20 and 21, and 9C leaves 5 and 6 uncovered.
   - Consequence: if "vitest only" governs, one new test is written (case 18), not about 4 and not 7. Three of the four suites named in 2A (screening-batch, onboarding-core, the cache module) get no new case. The plan would count 7 gaps, with 6 recorded as not written.
   - A person decides whether one test is the intended outcome, or whether the scope should widen.
2. **Answer 8A against "no production code changes" for case 7.**
   - Case 7 (precedence of the registry date and the screening date) is partly covered, and 8A asks for the gap to be written. Under 5A the plan's rule is not the contract, so the gap would be tested against the built rule, in Java.
   - Consequence: this is a Java test, so it is out under 3A, and no vitest test can pin it. The built rule is therefore pinned by nothing new.
   - A person decides whether that is accepted.
