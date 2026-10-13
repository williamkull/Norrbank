# ONB-2360 code map: the ONB-2140 status panel and the tests around it

Read-only survey of the repository on 2026-10-13, branch `loop/ONB-2360-run-18`. Line numbers were checked against the files. Nothing was run: there is no `java` on `PATH` and `JAVA_HOME` is empty in this worktree, and `rm-workspace/node_modules` does not exist. No baseline for `make test`, `bun run lint` or `bun run test` is known. Test names below come from reading the sources, not from a run.

## 1. Structure

### 1.1 What exists, per module

**rm-workspace** (`rm-workspace/src`)

- `onboarding/StatusPanel.tsx` (133 lines).
  - `StatusPanel` is at lines 11-48. Failed (14-23): "Status is unavailable right now." in `.error` and a native "Try again" button, added by ONB-2381. Loading (25-31): "Loading." in `.subdued`. Shown (33-47): a `dl.detail.status-panel` with Stage, Next step and Expected date. Line 38 is the stage label, and line 39 puts the procedure code in a `span.mono.subdued.procedure-code` beside it. Line 44 shows the date, or "Not yet known" when it is null.
  - `useCaseStatus` is at lines 65-123. State is tagged with the case it belongs to (70-77). `retry` is at 79-85. The effect (87-120) joins or creates the request, and attaches its own handler to the stored promise.
  - Module-level `held` (line 132) and `inFlight` (133) are the cache. **There is no `statusCache.ts`.** The cache lives inside the panel file.
- `onboarding/api.ts:57-64` is `CaseStatus` (`caseId`, `stage`, `procedureStageCode`, `nextStep`, `expectedDate: string | null`, `expectedDateSource: string | null`). `get<T>()` is at 66-72. `fetchCaseStatus` is at 82-84 and calls `/v2/cases/{caseId}/status`.
- `onboarding/CaseView.tsx:20` renders `<StatusPanel caseId=... />` with no `key`, above the "Case" panel (line 22). It is the only caller. `App.tsx` does not fetch statuses.
- `shared/formatting.ts`:
  - `formatIsoDate` (13-15) builds the date from `T00:00:00Z` and formats it with the UTC `sv-SE` formatter.
  - `STAGE_LABELS` (37-44) is keyed by the **enum name** the endpoint returns in `stage`. It is not keyed by procedure code. `NEXT_STEP_LABELS` (46-53).
  - `stageLabel` (55-57) and `nextStepLabel` (59-61) fall back to "Status not available".
  - The labels are filled in. The plan said they would ship as placeholders that fail a test. The strings are in the file, and `STAGE_LABELS` has "We are verifying the owners", which the plan called illustrative. Whether E. Sandberg approved them is not in the repository.
- `styles.css:50` is `.status-panel .procedure-code { display: block; ... }`. This is what puts the code on its own line. No test asserts it.

**onboarding-core** (`onboarding-core/src/main`, package `se.norrbank.onboarding`)

- `v2/cases/CaseStatusController.java:23-60`. `GET /v2/cases/{caseId}/status`. The method is at 43-54.
  - Line 45 resolves the principal, and line 46 loads the case with `cases.require`.
  - Lines 47-51 apply the ownership rule. The rule itself is `visibleTo` (56-59): `isOnboardingOperations()` or the case's `relationshipManagerId` equals `principal.userId()`. A failure throws `CaseNotFoundException`, so the caller sees 404.
- `v2/cases/CaseStatusDto.java:17-23`. The record carries `caseId`, `stage` (the enum **name**), `procedureStageCode`, `nextStep`, `expectedDate` (`LocalDate`) and `expectedDateSource`.
  - `nextStep` (40-52) returns `AWAITING_DOCUMENTS` when `documentsOutstanding > 0`, otherwise it switches on the stage.
  - The DTO has no `stageSince` and no `derivedAt`.
- `core/status/CaseStatusService.java:44-57` builds the status.
  - `AWAITING_REGISTRY_EVIDENCE` takes the registry date through `RegistryEvidenceReadService.expectedCompletionFor`. A missing row gives a null date.
  - `SCREENING_IN_PROGRESS` takes `nextScreeningRun()` (63-66, 02:00 Europe/Stockholm, from the injected `Clock`), with source `"screening"`.
  - Every other stage gets no date.
- `core/status/CaseStatus.java:21`. A record with `procedureStageCode()` derived from the stage.
- `core/stage/CaseStageValue.java:11-29` is the enum with the codes. `DOCUMENTS_OUTSTANDING` and `SCREENING_IN_PROGRESS` both map to `SCR-QUEUED`. `AWAITING_REGISTRY_EVIDENCE` is `EDD-PENDING`, `UNDER_ANALYST_REVIEW` is `PEP-REVIEW`, `ON_HOLD` is `SAN-HOLD` and `READY_FOR_DECISION` is `EDD-COMPLETE`.
- `core/stage/CaseStageRow.java:18-96` is the entity for `case_stage`. `CaseStageReadService.java:30-37` is read-only. A case with no row is answered as `SCREENING_IN_PROGRESS` (line 31), not as null. `CaseStageRepository.java:13` is a `JpaRepository`, and its save path is there for tests.
- `core/registry/RegistryEvidenceReadService.java:42-54` is a native select of six columns, including the owner-name column (line 26).
- `core/registry/CaseStatusProjection.java:23-103` keeps three of them. It has constants for positions 0, 2 and 3 and none for the name (28-32). An unknown evidence status throws `IllegalStateException` (83-89).
- `resources/db/migration/V6__case_stage.sql:11-21` creates the table. `resources/db/local-data.sql:80-111` creates and seeds `registry_evidence` and `case_stage` for the local profile.

**screening-batch** (`screening-batch/src/main/java/se/norrbank/screening`)

- `job/StageWriter.java:35-139` is the stage-table write. The class is not named in the plan. **The plan's `StageTableWriter` and `ExpectedDecision` do not exist**, but their work is done by this class.
  - A raw JDBC `MERGE` (43-59).
  - `anchorFor` (91-106) carries `stage_since` forward when the stored stage equals the new one. Otherwise it uses the run date.
  - `expectedDecision` (113-122) counts from the anchor: +2 days for `SCREENING_CLEARED`, +5 for `SCREENING_QUEUED`, +10 for `PEP_REVIEW`, and null for `SANCTIONS_HOLD` and `EDD_PENDING`.
  - `caseStageValue` (131-138) maps the batch enum to the `case_stage.stage` vocabulary.
- `job/ScreeningBatchJob.java:84-88` calls the writer before `StageFileLock` (91), in its own try/catch on `SQLException`. The stage file write follows (90-93). `expectedDecision` at 115-124 still uses `LocalDate.now()` for the stage file, as planned.
- `stage/CaseStage.java:14-29` is the batch enum. `stage/StageFileWriter.java`, `StageFileRecord.java` and `StageFileLock.java` are the file side and are unchanged by this work.

### 1.2 Planned in `docs/changes/ONB-2140/plan.md` and not built, or built differently

| Plan | What the code has |
|---|---|
| `statusCache.ts` with an injected clock and fetcher (plan.md:139, 155) | No file. The cache is `held` and `inFlight` in `StatusPanel.tsx:132-133` |
| Expiry at the next 02:05 Europe/Stockholm, or a 30-minute ceiling (plan.md:159) | **No expiry of any kind.** `held` is never cleared except by a page reload |
| Fetch in `App.tsx`, result passed down as props (plan.md:141) | The panel fetches for itself |
| DTO field `stage` is the procedure code, e.g. `EDD-PENDING` (plan.md:106) | `stage` is the enum name, and the code is in `procedureStageCode` |
| `stageSince`, `derivedAt` in the DTO; "assessed <date>" in the panel (plan.md:106, 176) | Neither is in the DTO or the panel |
| A missing `case_stage` row gives a null stage and "Not yet assessed" (plan.md:123) | It gives `SCREENING_IN_PROGRESS`, a date from the next 02:00 run, and the wording "Screening in progress" |
| Registry date wins while evidence is outstanding, otherwise the screening date (plan.md:112, 38-41) | Registry date only when the stage is `AWAITING_REGISTRY_EVIDENCE`. `case_stage.expected_decision_date` is **never read** by onboarding-core (only `V6`, `local-data.sql`, the entity and `StageWriter` mention it). Everything but the registry and no-row cases shows no date |
| `AWAITING_REGISTRY_EVIDENCE` next step from the registry, ahead of the stage (plan.md:114) | `nextStep` in the DTO follows documents, then the stage |
| Package `v2/status/`, `CaseStatusMapper`, `RegistryEvidenceDate` entity on a view `registry_evidence_rm` (plan.md:94-112) | `v2/cases/`, a DTO static factory, a native query and a projection class |
| `V6` plus a ServiceNow request (plan.md:49-58) | `V6` exists. Whether the request was raised is not in the repository |
| Plan said no change to the stage file | `screening-batch/CLAUDE.md` still says the stage "is written to the stage file and nowhere else". It is stale |

The brief says the write path "was unverified". It **was built**: `StageWriter` plus the call at `ScreeningBatchJob.java:84-88`.

## 2. Behaviour today

**Per stage** (`stage` from the endpoint, then label from `formatting.ts:37-53`; the date rule is `CaseStatusService.java:44-57`)

| `stage` | Plain wording | Code beneath | Next step wording | Date |
|---|---|---|---|---|
| `DOCUMENTS_OUTSTANDING` | Waiting for documents | `SCR-QUEUED` | Client returns the outstanding documents | none |
| `SCREENING_IN_PROGRESS` (also: no row) | Screening in progress | `SCR-QUEUED` | Overnight screening | next 02:00 run, source `screening` |
| `AWAITING_REGISTRY_EVIDENCE` | We are verifying the owners | `EDD-PENDING` | Company registry confirms the ownership | registry date while the evidence is outstanding; none if the row is missing or the evidence is complete |
| `UNDER_ANALYST_REVIEW` | Under analyst review | `PEP-REVIEW` | Analyst decides on the match | none |
| `ON_HOLD` | On hold with compliance | `SAN-HOLD` | Compliance clears the case | none |
| `READY_FOR_DECISION` | Ready for decision | `EDD-COMPLETE` | Four-eyes approval | none |

If `documentsOutstanding > 0` (`DocumentService.outstandingFor`), the next step is `AWAITING_DOCUMENTS` for every stage. The stage and its date are not changed.

**Date rules.**

- The panel shows the date from `formatIsoDate`, or "Not yet known" when it is null (`StatusPanel.tsx:44`).
- `expectedDateSource` is returned but the panel does not show it.
- The date the panel shows for a registry-pending case is the registry's, not `case_stage.expected_decision_date`.
- The anchoring that `StageWriter` does is therefore **invisible in the panel** today.
- When the registry evidence is `REGISTRY_COMPLETE` and the stage is still `AWAITING_REGISTRY_EVIDENCE`, there is no date.

**Cache.** A success is held for the page's life. A failure is never held. Two mounts of one case share one in-flight request. Nothing runs on a timer, on focus or on visibility (`StatusPanel.tsx:50-64`). A workspace left open across 02:00 keeps showing the previous day's stage. The wording promised by the plan, and the log in `platform/ops/logs/status-cache-2026-09-12.log` about a different (platform-side) cache, are not the same thing; that log is context only.

**Failure and retry.** Any non-OK answer or rejection gives the panel-local message and button. The rest of `CaseView` renders. "Try again" clears the failed state and makes one new request (`attempt` + 1 re-runs the effect). The state is tagged by case so another case's failure or answer never shows. Leaving a case drops its failed entry (117).

**Authorisation on the endpoint.**

- An RM sees only their own cases. Operations (`ONB_OPS`) sees all. Anything else gets 404, not 403.
- A request with no gateway headers gets 400, according to the test (`SsoPrincipalResolver` was not read).
- Roles and user come from request headers the gateway sets. `api.ts` also sets them from a browser global (`session.ts`). Whether the gateway overwrites them is unverified, as the plan said.
- `GET /v2/cases/{caseId}` has no ownership check (plan.md:331). Out of scope here.

## 3. Coverage of plan.md:253-292

"Covered" means a test exists that would fail if the behaviour **as built** broke. 23 cases: **16 covered, 3 partly, 4 not covered.**

| # | Plan case (plan.md line) | Existing test | Result |
|---|---|---|---|
| 1 | Anchored date does not move when the stage is unchanged (258) | `StageWriterTest.theAnchoredDateDoesNotMoveWhenTheStageIsUnchanged` | Covered |
| 2 | Stage change resets `stage_since` and the date (260) | `StageWriterTest.aStageChangeResetsTheAnchorAndRecomputesTheDate` | Covered |
| 3 | `EDD_PENDING` and `SANCTIONS_HOLD` yield no date (262) | `StageWriterTest.aCaseWaitingOnEvidenceOrOnComplianceCarriesNoDate` | Covered |
| 4 | Row carries `procedureStageCode()`, not `name()` (263) | `StageWriterTest.theRowCarriesTheProcedureCodeAndNotTheEnumName`. Also `CaseStageTest.theProcedureCodeIsNeverTheEnumName` | Covered |
| 5 | Stage file bytes unchanged by the new write (264) | Nothing runs `ScreeningBatchJob.run`. `StageFileWriterTest` tests the writer alone. `StageWriter` has its own database, so the file cannot be touched by it, but no test says so | **Not covered** |
| 6 | A failing table write does not block the stage file (265) | None. There is no test of the job, only of `StageWriter` and `StageFileWriter` | **Not covered** |
| 7 | Precedence: registry date wins while outstanding, screening date when `REGISTRY_COMPLETE`, the two local-dataset conflicts as fixtures (267-268) | `CaseStatusServiceTest.aCaseAwaitingRegistryEvidenceCarriesTheExpectedDate` covers the outstanding branch with `REGISTRY_PENDING`. No `REGISTRY_COMPLETE` case, no `UBO_UNCONFIRMED` case, no conflicting pair. The rule the plan names is not what the code does (see 1.2) | **Partly** |
| 8 | Next step for each stage, documents taking priority (269) | `CaseStatusControllerIT.saysWhatTheCaseIsWaitingOn` covers one stage (`AWAITING_REGISTRY_EVIDENCE`). The other five stages and the documents-outstanding override are untested. `CaseStatusDto.nextStep` has no unit test | **Partly** |
| 9 | IT happy path: the code is `EDD-PENDING` and not `EDD_PENDING` (271-272) | `CaseStatusControllerIT.showsThePlainStageValueAndTheProcedureCodeBesideIt`. As built, `stage` is the enum name and the code is asserted on `procedureStageCode` | Covered (as built) |
| 10 | Another RM's case returns 404 (272) | `CaseStatusControllerIT.tellsARelationshipManagerNothingAboutSomebodyElsesCase`. Also `letsOnboardingOperationsReadAnyCase` | Covered |
| 11 | No gateway header returns 400 (273) | `CaseStatusControllerIT.refusesARequestThatDidNotComeThroughTheGateway` | Covered |
| 12 | No `case_stage` row returns 200 with a null stage (274) | `CaseStatusControllerIT.aCaseTheNightlyRunHasNotStagedYetIsWaitingForTheNextRun`. As built, it asserts `SCREENING_IN_PROGRESS` and source `screening`, not null | Covered (as built) |
| 13 | Response body has no beneficial-owner names (275-277) | `CaseStatusControllerIT.neverPutsABeneficialOwnerNameInTheResponse`. One name (`OWNER_NAME`, line 39), one case, the 200 body only | Covered |
| 14 | Every stage and next-step code has a label (279-280) | `StatusPanel.test.tsx` "has wording for every code the service can emit" (413). The lists `STAGES` and `NEXT_STEPS` (13-29) are typed by hand, not read from the Java enum | Covered |
| 15 | `stageLabel` on an unknown code gives safe wording (281) | `StatusPanel.test.tsx` "gives safe wording for a code it does not know" (422). `formatting.test.ts` has no stage or next-step case | Covered |
| 16 | Panel shows plain wording with the code beneath it (282) | `StatusPanel.test.tsx` "shows plain wording with the procedure code beside it" (124). Text only; "beneath" is the CSS at `styles.css:50` and is not asserted. Also e2e `status-panel.spec.ts:59` | Covered |
| 17 | Panel with no date when none is known (283) | `StatusPanel.test.tsx` "says the date is not yet known rather than showing nothing" (142). Also e2e `:68` | Covered |
| 18 | A fetch failure renders inside the panel and leaves the case view intact (284) | `StatusPanel.test.tsx` "keeps a failed status inside the panel" (150) asserts the message only. No vitest test renders `CaseView` with a failing status. The "case view intact" half is asserted only in e2e `:92` (the heading) | **Partly** |
| 19 | Second selection within the ceiling does not call the fetcher (287) | `StatusPanel.test.tsx` "does not fetch a case it has already loaded" (158). Also `retry.independent` "check 6", and e2e `:76`. There is no ceiling | Covered (as built) |
| 20 | Entry fetched 01:50 is not served at 02:06 (288) | None, and no expiry exists | **Not covered** |
| 21 | Entry fetched 09:00 is not served at 09:31 (290) | None, and no ceiling exists | **Not covered** |
| 22 | Advancing the clock alone triggers no fetch and no timer (291) | `StatusPanel.test.tsx` "makes no request on focus, visibility change or the passing of time" (392). Also `retry.independent` "check 10" (544, 574, 582) | Covered |
| 23 | A failed fetch is not cached, so the next selection retries (292) | `StatusPanel.test.tsx` "does not hold a failed status: mounting the case again asks again" (284) | Covered |

**Other tests that touch the panel**, not named by the plan:

- `StatusPanel.retry.independent.test.tsx` has 34 cases, checks 1-10 from ONB-2381 plus unmount and request shape.
- `App.caseList*.test.tsx` and `App.pinned.test.tsx` render `App`. They stub `/v2/cases/{id}/status` so `CaseView` mounts, and none assert on the panel. They sit in front of `held`.
- `CaseList.test.tsx` has 2 cases and `formatting.test.ts` has 5. Neither tests stage or next-step labels, or `formatIsoDate`.
- `CaseStageTest` has 5 cases and `StageFileWriterTest` has 6. They test the batch enum and the file.
- No test covers `CaseStatusProjection` (the unknown-status exception, null date, `isOutstanding`), `CaseStageReadService`, `nextScreeningRun` (before and after 02:00, and the zone), `ScreeningBatchJob.run`, `formatIsoDate`, or the CSS.

## 4. Which layers each run covers

| Run | Layers | Run by the platform check |
|---|---|---|
| `bun run lint` (`tsc --noEmit`) | Types of `src/` including `src/__tests__/` (`tsconfig.json` includes `src` and `vite.config.ts`). **Not** `e2e/` | Yes |
| `bun run test` (vitest 2.1.3, happy-dom, `globals: true`, `src/**/*.{test,spec}.{ts,tsx}`) | The 7 files in `src/__tests__/`: the panel, retry, formatting, case list, `App` | Yes |
| `./mvnw test` (via `make test`) | Java unit and integration tests in onboarding-core (`src/test` and `src/itest`, both `*Test.java` and `*IT.java` under surefire), screening-batch and registry-link | **No** |
| `bun test platform/` (via `make test`) | `platform/detect.test.ts`. No link to the panel | **No** |
| `bun run test:e2e` (Playwright, Chromium, dev server) | `e2e/status-panel.spec.ts`, 4 cases. Stubs the two v2 routes at the network boundary. Not the backend, not the cache expiry | **No**. The CI job `playwright` runs it (`ci.yml`), but its "suite absent" skip message is stale |
| `./mvnw -B -f rm-workspace-e2e/pom.xml -Pe2e test` (Selenium) | The case list only. `WorkspaceStubServer` answers any `/v2/cases...` path with the case array, so a status request gets the wrong shape | **No**. CI job `selenium`, after `bun run build` |
| `make build` / `make lint` | `mvn package -DskipTests`, `bun run build`; `tsc --noEmit` | Only the lint half |

Consequence: of the 23 plan cases, the 13 backend ones (1-6 are screening-batch, 7-13 are onboarding-core) are **not exercised by the platform check at all**. A passing check says nothing about Java. Cases 14-23 (front end) are exercised, except the e2e-only part of case 18.

## 5. Risks

1. **Java is not runnable here.** No `java` on `PATH`, no `JAVA_HOME`. Any Java test written in this issue cannot be shown to pass in this worktree. Root `CLAUDE.md` requires `make build`, `make test` and `make lint` output before "done".
2. **Test-lock hook.** `.claude/hooks/test-lock.sh` is wired for `Edit|Write|NotebookEdit` in `.claude/settings.json`. It blocks edits to `*/src/test/*`, `*/src/itest/*`, `*.test.ts` and `*.test.tsx` **only while `.claude/fix-task.marker` exists**. **The marker is absent now**, so the hook lets everything through. `bin/fix-task begin` creates it and `end` removes it. The marker is gitignored (`.claude/.gitignore`), so a fix task in another worktree has no effect here. If a later step runs under a fix task, new files in `src/__tests__/`, `src/test/` and `src/itest/` would be blocked. `e2e/*.spec.ts` is not named by the hook and would not be blocked.
3. **Beneficial-owner names in fixtures.**
   - The names sit in the backend only, never in `rm-workspace/src`, `rm-workspace/e2e` or `rm-workspace-e2e` (`rg` for each owner and director name found no hit there). Front-end fixtures carry legal names, org numbers and case ids.
   - Names appear in `local-data.sql` (screening parties around lines 27-74, and `ubo_name` at 94-101), `CaseStatusControllerIT` (`OWNER_NAME`, line 39, inserted at 85-91), `CaseStatusServiceTest` (line 64), the registry CSV samples under `registry-link/samples/` and `local/registry/`, and the `registry-link` tests `RegistryEvidenceRepositoryTest` and `RegistryCsvParserTest`.
   - The IT's guard checks one name and one response. It does not check the 404 body, the ops-role response or the other owners seeded in `local-data.sql`. Nothing checks the log: `CaseStatusProjection.java:88` logs the org number only, and `onboarding-core/CLAUDE.md` bans names in log and error output.
   - A new front-end fixture must be built from `CaseStatus` (which has no name field) and must not copy rows from `local-data.sql`. New Java fixtures should reuse `OWNER_NAME`-style constants, and a new test should assert on that constant.
   - Do not copy the names into docs. This map does not.
4. **The plan and the code disagree**, so a test written to the plan will fail or test the wrong thing. The disagreement is in section 1.2: no expiry, the DTO `stage` value, the no-row answer, and the precedence rule. Tests for cases 7, 20 and 21 need a decision (see section 6) before they can be written.
5. **Stale panel after 02:00.** `held` has no expiry. A workspace left open overnight shows the previous day's stage and date until a reload. This is also why cases 20 and 21 cannot be tested yet.
6. **Module state shared across tests.** `held` and `inFlight` live for a whole test file. Existing tests use a distinct case id per test (`ONB-2026-0008xx`). A new test that reuses an id gets the cached status and makes no request. `vi.resetModules()` is the alternative.
7. **Stage label keys.** `STAGE_LABELS` is keyed by the enum name, but the plan said procedure code (plan.md:128). Two enum values share `SCR-QUEUED`, so the procedure code could not tell them apart. Case 14's lists are hand-typed, so a new `CaseStageValue` would not fail the front-end test (it would be shown as "Status not available").
8. **Hidden coupling in CaseStatusControllerIT.** It seeds in `@BeforeEach` behind an `existsById` guard and creates `registry_evidence` by hand, because the table is registry-link's and not a migration. The H2 database is shared by every `@SpringBootTest` in the module with the `test` profile (`jdbc:h2:mem:onboarding-test`). Another test that seeds the same case ids, or an `ONB-2026-0006xx` id from `CaseStatusServiceTest`, would collide.
9. **Time.** `StageWriter` anchors on `Instant` and computes dates in UTC. `ScreeningBatchJob.expectedDecision` still uses `LocalDate.now()` (platform default zone), and `Instant.now()` at line 60, which plan.md:322 left alone on purpose. `CaseStatusService` uses `Clock` and a hard-coded `Europe/Stockholm`. A test for the 02:00 boundary must inject a `Clock`.
10. **Conventions for new tests.** `toBeDefined()`, not `jest-dom` (the plan said none is installed; `package.json` confirms). No `any`. The `ux-workspace` and `brand` skills apply to any new on-screen string. Java tests use sentence-named methods and `@TempDir`. All Java test classes in `screening-batch` are package-private, and `StageWriterTest` builds H2 in `MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE`.
11. **Stale documentation.** `screening-batch/CLAUDE.md` ("written to the stage file and nowhere else") and the `ci.yml` Playwright skip text no longer match the code. Not part of this issue.

## 6. Unknowns and open questions

1. **What the test issue is meant to test.** Cases 20 and 21 describe a cache that was never built. A test cannot pass against code that has no expiry. Decide whether ONB-2360 adds the cache (a change to production code, not only tests), drops those two cases, or writes them as known-failing.
2. **Which behaviour is the contract**, the plan's or the built one? For the stage value in the DTO, the no-row answer ("Not yet assessed" against `SCREENING_IN_PROGRESS`), and the date precedence (including whether `case_stage.expected_decision_date` should ever reach the panel). Section 3 treated the built behaviour as the contract where the plan's words could not be tested.
3. **Whether the `REGISTRY_COMPLETE` branch should show a date.** The plan wanted the screening date. The code shows none.
4. **Whether the label copy is approved.** `formatting.ts:37-53` is filled in. Nothing in the repository records approval by E. Sandberg.
5. **Whether `ScreeningBatchJob.run` is testable** without a database holding the case, party and result tables, and a `ScreeningListProvider`. I read `run` but not `CaseReader` or `ResultWriter`, so the effort for cases 5 and 6 is unknown.
6. **Whether the gateway overwrites `X-Norrbank-User` and `X-Norrbank-Roles`.** Unchanged from plan.md:334.
7. **Whether the ServiceNow change request and grants for `V6` were done**, and whether the `/v2` route on the workspace host exists. Neither can be seen from the repository. `deploy/` was only searched for "stage" and had no hits.
8. **Where the "platform check" is defined.** It is given in the brief. It is not in `ci.yml`, the `Makefile` or `platform/README.md`. I took it as stated.
9. Baselines: `bun run lint`, `bun run test` and the Java suites have not been run by me.

## 7. Build and test steps

Where: a terminal in the repository root unless stated.

1. Front end (this is what the platform check runs). Where: `rm-workspace/`.
   - `bun install --frozen-lockfile`
   - `bun run lint` (`tsc --noEmit`, must be clean)
   - `bun run test` (`vitest run`). One file: `bun run test -- src/__tests__/StatusPanel.test.tsx`
2. Java. Needs a JDK 21 on `JAVA_HOME` or `java` on `PATH`. Not available in this worktree.
   - Everything: `./mvnw -B test`
   - One module: `./mvnw -B -pl screening-batch test`, or `-pl onboarding-core`
   - One class, with `-Dtest=StageWriterTest -Dsurefire.failIfNoSpecifiedTests=false`
   - `CaseStatusControllerIT` runs under surefire with the unit tests.
3. Repo-wide, required by `CLAUDE.md` before reporting done, with the output pasted: `make build`, `make test`, `make lint`. `make build` must end with "Build succeeded" and `make lint` with "Lint clean". `make lint` is `tsc --noEmit` only. Nothing lints Java.
4. Playwright. Where: `rm-workspace/`. `bun install --frozen-lockfile && bunx playwright install --with-deps chromium && bun run test:e2e`. It starts its own dev server on 5173 (`WORKSPACE_PORT` overrides). It needs no backend.
5. Selenium (the case list only). Where: `rm-workspace/`: `bun run build`. Then in the root: `./mvnw -B -f rm-workspace-e2e/pom.xml -Pe2e test`, with `NORRBANK_E2E_HEADLESS=1` where there is no display.
6. Writing a vitest test for the panel (stub pattern from `StatusPanel.test.tsx:43-104`):
   - `vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(status), { status: 200 })))`, and `vi.unstubAllGlobals()` in `afterEach`.
   - Use a unique case id per test.
   - For a held request use a deferred `Response` promise, and call its resolver inside `act`.
   - For a failure use a 500 `Response`, or `mockRejectedValue`.
7. Fix task. If the test-lock is needed or has to be avoided: `bin/fix-task status`. It is closed now, and tests are writable.
