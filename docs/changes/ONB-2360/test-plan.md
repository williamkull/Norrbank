# Test plan: the ONB-2140 status panel

Jira: ONB-2360. Status: approved by William Kull (Onboarding platform) on 2026-10-13, before any test was written, and re-approved by him on 2026-10-13 after commit b549b4e. This further revision (2026-10-13) corrects tense and the design file name (now `plan.md`) and goes back to him.
Written 2026-10-13 from `docs/changes/ONB-2140/plan.md:253-292`, corrected by `code-map.md` and `spec.md` in this folder.

The built code is the contract. This plan pins what the code does, not what the ONB-2140 plan said. The differences are in section 3.

## 1. What this plan says

Every one of the 23 cases in `plan.md:253-292` has one status:

- **cited**: an existing test covers it. File and test name are given.
- **written here**: a new test, written under this issue.
- **left out**: no test covers it, and the reason is given.

| Status | Cases | Count |
|---|---|---|
| Cited | 1-4, 9-13 (Java); 14-17, 19, 22, 23 (vitest) | 16 |
| Written here | 18 | 1 |
| Left out | 5, 6, 7, 8, 20, 21 | 6 |
| **Total** | | **23** |

Every citation was checked against the test file on 2026-10-13: the file exists and a test of that name is in it. The Java tests were **read, not run**: there is no JDK 21 in this worktree. The front-end check was run: `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test` passed, with `tsc` clean and, with both new files, 9 test files and 106 tests. `make build`, `make test`, `make lint`, the Java suites and Playwright were not run, because the worktree has no JDK.

## 2. The 23 cases

Layer is Java unit, Java integration, vitest or Playwright. Line numbers are the line of the test declaration.

| # | Case (plan.md line) | Layer | Status | Test, or reason |
|---|---|---|---|---|
| 1 | Anchored date does not move when the stage is unchanged (258) | Java unit | Cited | `screening-batch/src/test/java/se/norrbank/screening/job/StageWriterTest.java:62`, `theAnchoredDateDoesNotMoveWhenTheStageIsUnchanged` |
| 2 | A stage change resets `stage_since` and the date (260) | Java unit | Cited | `StageWriterTest.java:74` (same folder), `aStageChangeResetsTheAnchorAndRecomputesTheDate` |
| 3 | `EDD_PENDING` and `SANCTIONS_HOLD` yield no date (262) | Java unit | Cited | `StageWriterTest.java:84`, `aCaseWaitingOnEvidenceOrOnComplianceCarriesNoDate` |
| 4 | The row carries `procedureStageCode()`, not `name()` (263) | Java unit | Cited | `StageWriterTest.java:93`, `theRowCarriesTheProcedureCodeAndNotTheEnumName`. Also `screening-batch/src/test/java/se/norrbank/screening/stage/CaseStageTest.java:22`, `theProcedureCodeIsNeverTheEnumName` |
| 5 | The stage file's bytes are unchanged by the new write (264) | Java unit | Left out | Nothing runs `ScreeningBatchJob.run`. A test would need a database fixture or a production change, and Java cannot run here. |
| 6 | A failing table write does not block the stage file (265) | Java unit | Left out | Same reason as case 5. |
| 7 | Precedence of the registry date and the screening date (267-268) | Java unit | Left out | Partly covered by `onboarding-core/src/test/java/se/norrbank/onboarding/core/status/CaseStatusServiceTest.java:57`, `aCaseAwaitingRegistryEvidenceCarriesTheExpectedDate`. The remaining gap is Java, and this issue is vitest only. |
| 8 | Next step for each stage, documents taking priority (269) | Java unit and integration | Left out | Partly covered by `onboarding-core/src/itest/java/se/norrbank/onboarding/v2/cases/CaseStatusControllerIT.java:109`, `saysWhatTheCaseIsWaitingOn`, which covers one stage. The remaining gap is Java, and this issue is vitest only. |
| 9 | Happy path: stage value and procedure code (271-272) | Java integration | Cited, as built | `CaseStatusControllerIT.java:99`, `showsThePlainStageValueAndTheProcedureCodeBesideIt`. See difference A. |
| 10 | Another RM's case returns 404 (272) | Java integration | Cited | `CaseStatusControllerIT.java:119`, `tellsARelationshipManagerNothingAboutSomebodyElsesCase`. Also `:127`, `letsOnboardingOperationsReadAnyCase`. |
| 11 | No gateway header returns 400 (273) | Java integration | Cited | `CaseStatusControllerIT.java:136`, `refusesARequestThatDidNotComeThroughTheGateway` |
| 12 | A case with no `case_stage` row (274) | Java integration | Cited, as built | `CaseStatusControllerIT.java:141`, `aCaseTheNightlyRunHasNotStagedYetIsWaitingForTheNextRun`. See difference B. |
| 13 | The response body has no beneficial-owner names (275-277) | Java integration | Cited | `CaseStatusControllerIT.java:155`, `neverPutsABeneficialOwnerNameInTheResponse`. It checks one name, one case, the 200 body only. |
| 14 | Every stage and next-step code has a label (279-280) | vitest | Cited | `rm-workspace/src/__tests__/StatusPanel.test.tsx:413`, "has wording for every code the service can emit". It asserts a non-fallback label, not the wording. The code lists are typed by hand, not read from the Java enum. |
| 15 | An unknown code gives safe wording (281) | vitest | Cited | `StatusPanel.test.tsx:422`, "gives safe wording for a code it does not know" |
| 16 | Plain wording with the procedure code beside it (282) | vitest | Cited | `StatusPanel.test.tsx:124`, "shows plain wording with the procedure code beside it". The text is asserted. "Beneath" is CSS (`styles.css:50`) and is not. Also Playwright `rm-workspace/e2e/status-panel.spec.ts:59`. |
| 17 | No date shown when none is known (283) | vitest | Cited | `StatusPanel.test.tsx:142`, "says the date is not yet known rather than showing nothing". Also Playwright `status-panel.spec.ts:68`. |
| 18 | A fetch failure renders inside the panel and leaves the case view intact (284) | vitest (the e2e half is Playwright) | **Written here** | Two tests render `CaseView` with a failing status: `rm-workspace/src/__tests__/CaseView.statusFailed.test.tsx` ("CaseView" › "keeps the rest of the case view when the status fails to load"), a 500 from the status fetch; and `rm-workspace/src/__tests__/CaseView.statusFailed.independent.test.tsx` ("CaseView, status request rejected (independent)" › "shows the failure only in the Status panel and keeps the rest"), a rejected fetch, kept by William Kull's decision of 2026-10-13. Behaviour B1-B4 in `spec.md`, "The case 18 test". `StatusPanel.test.tsx:150`, "keeps a failed status inside the panel", covers the panel half only; Playwright `status-panel.spec.ts:92` covers the heading only. |
| 19 | A second selection does not call the fetcher (287) | vitest | Cited, as built | `StatusPanel.test.tsx:158`, "does not fetch a case it has already loaded". There is no ceiling to stay within. Also `StatusPanel.retry.independent.test.tsx` and Playwright `status-panel.spec.ts:76`. |
| 20 | An entry fetched at 01:50 is not served at 02:06 (288) | vitest | Left out | The panel cache has no expiry (`rm-workspace/src/onboarding/StatusPanel.tsx:132`), so the case cannot pass. |
| 21 | An entry fetched at 09:00 is not served at 09:31 (290) | vitest | Left out | Same reason as case 20. There is no ceiling either. |
| 22 | The passing of time alone triggers no fetch and no timer (291) | vitest | Cited | `StatusPanel.test.tsx:392`, "makes no request on focus, visibility change or the passing of time". Also `StatusPanel.retry.independent.test.tsx`, check 10. |
| 23 | A failed fetch is not cached, so the next selection retries (292) | vitest | Cited | `StatusPanel.test.tsx:284`, "does not hold a failed status: mounting the case again asks again" |

Case 19 is also marked "as built" because the plan's cache module and ceiling do not exist; the test pins the behaviour that does.

## 3. Differences between the plan and the code, accepted

William Kull accepted these on 2026-10-13 (answer 5A). Tests pin the code.

| | Plan said | Code does |
|---|---|---|
| A | The DTO field `stage` is the procedure code (`plan.md:106`). | `stage` is the enum name. The code is in `procedureStageCode`. Case 9 is "as built". |
| B | A case with no `case_stage` row gives 200 with a null stage (`plan.md:123`). | It gives `SCREENING_IN_PROGRESS` with a date from the next 02:00 run and source `screening`. Case 12 is "as built". |
| C | The registry date wins while evidence is outstanding, otherwise the screening date (`plan.md:112`). | The registry date shows only at `AWAITING_REGISTRY_EVIDENCE`. `case_stage.expected_decision_date` is never read by onboarding-core. |
| D | `REGISTRY_COMPLETE` shows the screening date. | `REGISTRY_COMPLETE` shows no date. |

Differences C and D are why case 7 stays partly covered: the rule the plan describes is not the rule the code has.

## 4. What the platform check runs

Runs:

- `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test`.
- `bun run lint` is `tsc --noEmit` over `src/`, tests included.
- `bun run test` is vitest over every file it discovers under `rm-workspace/src/`, 9 at this revision. This covers cases 14-19, 22 and 23, including the two case 18 test files, which are written and pass.

Does not run:

- Java, cases 1-13 (`./mvnw test`).
- Playwright, including the e2e half of case 18 (`bun run test:e2e`).
- Selenium (`rm-workspace-e2e`).
- `bun test platform/`.

A green check says nothing about cases 1-13.

`make build`, `make test` and `make lint` were not run. The worktree has no JDK 21, so `check-java` exits 1 and all three fail before they start. William Kull decided on 2026-10-13 that the front-end command above is the done check, and that every report says so. Root `CLAUDE.md:19-23` asks for the three make targets. This plan does not meet that, by decision.

## 5. Risks carried forward

1. **No cache expiry.** A workspace left open past 02:00 shows the previous day's stage until it is reloaded. Cases 20 and 21 stay unwritten until a new issue adds expiry and then writes them.
2. **The check does not run the backend.** A green check says nothing about cases 1-13, and the cited Java tests were read, not run.
3. **Cases 7 and 8 stay partly covered.** The built date rule is pinned by no new test.

## 6. What is not changed

- No production file.
- No existing test: those cited above are not edited, weakened, skipped or deleted.
- No Java, Playwright or Selenium test is written.
- Nothing in another issue's folder under `docs/changes/`.

The two case 18 tests are written and pass against the built code. Had one failed, it would have been left out of the change and the fault recorded in `docs/changes/ONB-2360/` for a new issue. No test is skipped or marked known-failing.
