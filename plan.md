# ONB-2140 — Status panel for the RM workspace

## Context

Corporate clients ask their relationship manager where onboarding stands, the RM rings
onboarding operations, and operations spends about a third of inbound time on status-only
queries (`intent/onboarding-status-for-rms.md`). The accepted spec (`spec.md`) puts one
panel on the existing case view showing **Stage**, **Next step** and **Expected date**, read
from a v2 endpoint behind the existing SSO gateway JWT, adding nothing to the workspace
session. Three concerns were raised and resolved before planning: C1 show plain wording
*and* the KYC procedure code; C2 registry-derived expected date, name stripped at the
projection; C3 corporate portal out of scope.

Out of scope per spec: the corporate portal, and any change to how a case's stage is
*decided*. This change reports stage; it does not define it.

### The finding that shapes everything

**The stage the panel needs is not reachable from onboarding-core.** It is derived nightly
by screening-batch and written to one place only — a pipe-delimited, ISO-8859-1 flat file
on the batch host, rewritten wholesale under an exclusive lock at 02:00
(`screening-batch/src/main/java/se/norrbank/screening/stage/StageFileWriter.java:16`,
`screening-batch/CLAUDE.md:17`, `.../job/ResultWriter.java:14`). An interactive HTTP request
cannot read it: `ops/screening-batch.cron:5` says nothing may read the file during the run.
Neither `spec.md` nor the intent acknowledges this.

Both halves of C1 already exist, in the wrong deployable:
`screening-batch/.../stage/CaseStage.java:14-29` carries an ops-console label *and* the
procedure code (`EDD_PENDING` → `"EDD-PENDING"`) for each stage. onboarding-core has no
dependency on that module, and the stage file writes the enum name (`EDD_PENDING`), which
`CaseStage.java:10-12` says explicitly must **not** be what appears outside operations.

Three decisions were taken with the answers to my questions:

1. **Stage reaches the API through a new `case_stage` table** that screening-batch writes
   alongside the stage file. The derivation (`ScreeningRules.deriveStage`) is untouched, so
   this reports stage rather than redefining it.
2. **Expected date: registry wins while evidence is outstanding**, otherwise the screening
   date. They disagree on 3 of 6 open cases in the local dataset (Nordkap 2026-09-16 vs
   2026-10-01; Malmö 2026-09-08 vs 2026-09-30) and a case cannot be decided before its
   registry evidence lands.
3. **The expected date is anchored to the run that set the stage.** Today
   `ScreeningBatchJob.expectedDecision()` is `LocalDate.now().plusDays(N)`, recomputed every
   night, so a stalled case's date advances daily — the exact behaviour that would *increase*
   the calls this change exists to remove.

## Files that change

### 1 · Platform change request (ServiceNow) — no code, longest lead time

Raise first; steps 4–6 cannot be verified in a real environment without it.

- Apply `V6__case_stage.sql` in every environment. Migrations are applied by the platform
  pipeline, not the app (`onboarding-core/CLAUDE.md:32`); there is no Flyway in the repo.
- Grant `screening_batch` insert/update on `case_stage`, `onboarding_core` select on it.
- Create a view `registry_evidence_rm (org_no, evidence_status, expected_completion)` and
  grant `onboarding_core` select **on the view only, never on `registry_evidence`**. This
  makes C2's strip enforced by the database, not just by our code.

### 2 · Schema and local data

- **New** `onboarding-core/src/main/resources/db/migration/V6__case_stage.sql`:
  `case_id` (pk), `stage`, `procedure_stage_code`, `expected_decision_date` (nullable),
  `stage_since` (not null — the anchor), `run_id`, `derived_at`.
- `onboarding-core/src/main/resources/db/local-data.sql` — seed `registry_evidence` and
  `case_stage` rows for the eight local cases. **Required, not optional:** the local profile
  today has no `registry_evidence` table and no rows (`ddl-auto: create-drop` builds the
  schema from entities only), and `make registry-import` names a class that does not exist
  (`se.norrbank.registry.RegistryLinkImport` — `grep "static void main" registry-link` is
  empty). Without this the panel cannot be run or seen locally at all.

### 3 · screening-batch — write the stage it already derives

- **New** `.../screening/stage/StageTableWriter.java` — raw JDBC, standard-SQL `MERGE`, the
  same idiom and for the same reason as `registry-link/.../RegistryEvidenceRepository.java:18-22`
  (`ON CONFLICT` is Postgres-only and does not parse in the H2 tests).
- **New** `.../screening/stage/ExpectedDecision.java` — the anchoring rule as a pure
  function, lifted out of `ScreeningBatchJob.expectedDecision()`: if the stored stage equals
  the derived stage, carry `stage_since` and `expected_decision_date` forward untouched;
  otherwise `stage_since = runDate` and the date is computed from it.
- `.../screening/job/ScreeningBatchJob.java` — one call, placed at line ~72, **before**
  `StageFileLock.acquire()`. The stage list is fully computed at line 71, so the table write
  adds nothing to the lock window that operations schedules other work around
  (`batch.expected.runtime.minutes=4`). Wrapped in its own try/catch that logs and continues:
  the stage file write stays the run's contract.
- The stage file's own bytes are **unchanged**, so the ops console is untouched.

### 4 · onboarding-core — the two read sides

- **New** `core/screening/CaseStageRow.java` + `CaseStageRepository.java`, and a read method
  on `core/screening/ScreeningReadService.java`. Read-only by construction, matching that
  class's stated design (`ScreeningReadService.java:10` — "There is deliberately no write
  path here") and `onboarding-core/CLAUDE.md:21`.
- **New** `core/registry/RegistryEvidenceDate.java` — an entity mapped to
  `registry_evidence_rm` declaring **only** `org_no`, `evidence_status`,
  `expected_completion`. `ubo_name` is never mapped into this service, so C2's strip is
  structural rather than a filtering step someone can forget. Join is case → `org_no` → at
  most one row (`org_no` is that table's primary key); `CaseRepository.findByOrgNo` already
  exists for the other direction.

### 5 · onboarding-core — the endpoint

New package `v2/status/`, copying the `cd693c1` template exactly (record DTO, `@Component`
mapper, one `*IT`):

- `CaseStatusDto` — `caseId`, `stage` (the procedure code, e.g. `EDD-PENDING`), `stageSince`,
  `nextStep` (a code), `expectedDecisionDate`, `expectedDateSource`, `derivedAt`.
  **Codes on the wire, never prose:** the AML code stays authoritative and verbatim, and
  RM-facing wording stays owned by `ux-workspace`/`brand@3.2` in the front end. `LocalDate`
  fields serialise as ISO-8601 typed dates, not hand-formatted strings (root
  `CLAUDE.md:32`).
- `CaseStatusMapper` — the precedence rule (registry wins while `evidence_status !=
  REGISTRY_COMPLETE`) and the next-step derivation from data we already hold:
  `DocumentService.outstandingFor` non-empty → `AWAITING_DOCUMENTS`, else registry
  outstanding → `AWAITING_REGISTRY_EVIDENCE`, else by stage.
- `CaseStatusController` — `GET /v2/cases/{caseId}/status`. Already matched by the
  `/v2/**` glob in `deploy/gateway/onboarding-core.yaml:9`, so **no onboarding-core gateway
  edit is needed**.
  It **does** check ownership: `principal.isOnboardingOperations() ||
  case.getRelationshipManagerId().equals(principal.userId())`, else 404. The existing
  `CaseQueryController.java:48` resolves the principal and throws it away, so any
  authenticated employee can read any case by id — do not copy that shape.
- A missing `case_stage` row (a case opened since the last 02:00 run) returns a null stage;
  the panel shows "Not yet assessed" and still shows next step from outstanding documents.

### 6 · rm-workspace — the panel

- `src/shared/formatting.ts` — `STAGE_LABELS` keyed by procedure code, `NEXT_STEP_LABELS`,
  `stageLabel()`, `nextStepLabel()`, `formatIsoDate()` for calendar dates. Presentation
  formatting belongs here per `rm-workspace/CLAUDE.md:17`.
  **Do not route stage through `lifecycleLabel`** — it falls back to the raw input
  (`formatting.ts:22`) and `formatting.test.ts:23` already pins
  `lifecycleLabel("EDD_PENDING") === "EDD_PENDING"`. A miss must yield safe wording, never a
  raw code on an RM surface.
- `src/onboarding/api.ts` — `CaseStatus` interface and `fetchCaseStatus(caseId)`.
- **New** `src/onboarding/StatusPanel.tsx` — reuses `shared/Panel`, prop-driven, renders the
  plain stage with the procedure code beneath it in a secondary line (`className="subdued"`,
  per C1), next step, expected date.
- **New** `src/onboarding/statusCache.ts` — see below. `App.tsx` calls `getCaseStatus(caseId)`
  through it, never `fetchCaseStatus` directly.
- `src/App.tsx` and `src/onboarding/CaseView.tsx` — the fetch goes in `App.tsx`, beside the
  only other fetch in the codebase, and the result is passed down as props. This keeps
  `StatusPanel` testable exactly like `CaseList` and avoids introducing the repo's first
  `vi.mock` (there is no API-mocking precedent anywhere in `src/__tests__/`).
  A failed status fetch must stay panel-local and must not break the case view.

### The cache — required, not an optimisation

An RM does not open one case. They open ten before lunch and leave the workspace open all
day, and the case list is already fetching. So the traffic is not one call per case open —
it is a morning spike against a ceiling sized for the connection pool rather than for demand,
and then unbounded re-opens as they click between cases for the rest of the day. Nothing in
the repo says this; it is how the workspace is actually used.

`statusCache.ts` is a module-scoped `Map<caseId, { status, expiresAt }>` with an injected
clock and an injected fetcher, so it unit-tests as a pure module and needs no mocking
framework — matching the repo's zero-mock test style.

- **Expiry is the earlier of** the next 02:05 Europe/Stockholm batch boundary after the fetch,
  and a 30-minute ceiling. The boundary is the load-bearing half: the batch rewrites *every*
  case stage in one pass, so every cached entry goes stale at the same instant and a rolling
  TTL is simply wrong — an entry fetched at 01:50 under a 30-minute TTL would keep serving
  pre-run data until 02:20. The ceiling bounds the damage if the batch host's zone is not
  what we assume (it runs on the platform default, `ScreeningBatchJob.java:85`) and covers
  next-step changing intra-day as documents arrive.
- **Expire lazily. Never eagerly, never on a timer.** No `setInterval`, no refetch on focus or
  visibility. A miss or an expired entry refetches only when the RM next selects that case.
  Expiring the whole map at 02:05 and refetching would manufacture exactly the spike this is
  meant to remove.
- **Do not prefetch statuses for the case list.** That turns one call per case *opened* into
  one per case *listed*, against the same ceiling, at the same time of morning.
- **In memory only — no `localStorage`, no `sessionStorage`.** There is no client-side
  persistence anywhere in this codebase today, and adding one is the wrong thing to do under
  a spec constraint reading "adds nothing to the workspace session"
  (`rm-workspace/CLAUDE.md:15`). The cache dies on reload, which is correct.
- The panel shows the DTO's `derivedAt` as "assessed <date>", so a stale read is visible to
  the RM rather than silent.

Honest about what this buys: it does not reduce the cost of the first ten opens, it removes
the unbounded re-open cost across a day-long session. That is the half that scales with how
long the workspace stays open.
- `src/styles.css` — a rule for the secondary code line if `subdued` is not enough. Global
  CSS with semantic class names is the convention; there is no CSS-in-JS or design system.

### The copy is not mine to write

`STAGE_LABELS` and `NEXT_STEP_LABELS` ship as placeholders that **fail a test until filled**.
`CaseStage.opsConsoleLabel()` is ops-console wording for a different audience, the spec's
"We are verifying the owners" is illustrative rather than approved, and `brand@3.2` and
`ux-workspace@1.1` are in force. I will wire the maps and the test; the strings come from
E. Sandberg.

## Order of work

1. Platform change request — raise immediately, runs in parallel with everything below.
2. `V6` + local schema and seed data. Nothing downstream is demonstrable without it.
3. screening-batch stage-table write + anchoring, with tests.
4. onboarding-core read sides (`case_stage`, registry date-only).
5. onboarding-core `v2/status/` endpoint, mapper, unit tests, `CaseStatusControllerIT`.
6. rm-workspace copy maps, api, `StatusPanel`, wiring, tests.
7. `make build`, `make test`, `make lint`, output pasted. Then a real local run.

Steps 3–6 are bottom-up so each is independently testable; 4 and 6 can overlap once the DTO
shape in 5 is fixed.

## Risks

**Riskiest step: 3.** Not because the code is hard — it is a dozen lines beside
`ResultWriter` — but because it is the only step whose blast radius is an unattended 02:00
batch job that operations schedules other work around, and the only step where a failure is
invisible until the next morning. If the table write throws after the results insert, the
run aborts, the stage file is never rewritten, and the ops console silently serves yesterday's
stages. Hence: write before the lock, own try/catch, file write remains the contract, and the
endpoint treats a stale or missing row as unavailable rather than guessing.

Also live:

- **onboarding-core startup.** Prod runs `ddl-auto: validate`, and tests build their schema
  from entities and never from `db/migration/`. A new entity for a table absent in some
  environment fails the whole service at boot — taking down the case list, not just the
  panel. So the migration and grants land and are confirmed everywhere *before* the entity
  deploys, in a separate release.
- **Gateway capacity, and the cache TTL against the 02:00 batch.** 50 rps, "sized against the
  service's connection pool, not against demand" (`onboarding-core.yaml:23-28`). The cache in
  step 6 is what keeps a day-long session bounded, so its expiry rule is a capacity control,
  not a nicety — and it is coupled to the batch. Because the run rewrites every case stage in
  one pass, everything cached against it expires together at the boundary rather than
  spreading out the way a per-entry TTL would. Two failure modes follow, in opposite
  directions: expire eagerly at 02:05 and every open session refetches at once, which is the
  spike we are trying to avoid; use a rolling TTL and entries fetched just before the run keep
  serving pre-run stages afterwards. Lazy expiry at the boundary avoids both, and it still
  needs the boundary to be right — if the batch's cron zone is not Europe/Stockholm, the
  30-minute ceiling is the only thing containing the error. Confirm the zone with onboarding
  operations; it is not in `ops/screening-batch.cron`, which states the window without one.
  Raising the rate limit remains a platform change with the onboarding-core owner if the
  morning spike still breaches it.
- **`/v2` from the workspace origin.** `deploy/gateway/rm-workspace.yaml` declares `/**` on
  `workspace.norrbank.internal` with no `forwardClaims`, and there is no `/v2` route on that
  host, yet `vite.config.ts:9` says the gateway fronts both on one origin in deployed
  environments. `fetchCases` works today, so something undocumented makes it work — confirm
  with platform rather than assume, because it is the difference between a working panel and
  an error box in production.
- **Two cases, one org.** `registry_evidence` is keyed by `org_no`, so two concurrent cases
  for the same company share one expected date and one evidence status. Correct for the
  registry, potentially confusing on a case surface.
- **`SCREENING_CLEARED` maps to `EDD-COMPLETE`** (`CaseStage.java:29`, pinned by
  `CaseStageTest.java:41`). A case that never required EDD will show an "EDD-COMPLETE" code
  beneath its stage. Correct per the KYC procedure, and worth warning RMs about.
- **Staleness is unobservable.** screening-batch writes no completion marker of any kind —
  no run table, and `run_id` is a truncated UUID, not a timestamp. `derived_at` on the new
  table is the first staleness signal the estate will have.

## Tests that prove it

**screening-batch** (`src/test/java/.../stage/`, matching the `92dc7c7` style — sentence-named
methods, private row factories, `@TempDir`, loop-over-`values()` invariants):
- The anchored date does not move when the stage is unchanged across two runs. *This is the
  test that proves the fix for the daily-slip problem.*
- A stage change resets `stage_since` and recomputes the date.
- `EDD_PENDING` and `SANCTIONS_HOLD` still yield no date.
- The table row carries `procedureStageCode()`, not `stage.name()`.
- The stage file's bytes are unchanged by the new write — the ops console regression guard.
- A failing table write does not prevent the stage file being written.

**onboarding-core** (`src/test/` unit, `src/itest/` per `CLAUDE.md:20`):
- Precedence: registry date wins while evidence is outstanding; screening date when
  `REGISTRY_COMPLETE`; the Nordkap and Malmö conflicts from the local dataset as the fixtures.
- Next step for each stage, and documents-outstanding taking priority.
- `CaseStatusControllerIT` — happy path asserting `stage` is `EDD-PENDING` (hyphen, the
  procedure code) and not `EDD_PENDING`; a case belonging to another RM returns 404; no
  gateway header returns 400 (the existing convention, `CaseQueryControllerIT.java:57`); a
  case with no `case_stage` row returns 200 with a null stage.
- **The C2 test that matters:** assert the serialised response body contains none of the
  beneficial-owner names seeded in `local-data.sql`. A structural guarantee still deserves a
  test that fails loudly if someone later maps the full row.

**rm-workspace** (`src/__tests__/`, vitest + testing-library, `toBeDefined()` — there is no
`jest-dom` in this repo):
- Every stage code and next-step code the service can emit has a label. **This is the gate
  that stops placeholder copy shipping.**
- `stageLabel` on an unknown code yields safe wording, not the raw code.
- `StatusPanel` renders plain wording with the procedure code beneath it (C1), and renders
  the panel with no date when none is known.
- A status fetch failure renders inside the panel and leaves the rest of the case view intact.

Cache tests (`statusCache.test.ts`, pure module, injected clock and fetcher — no mocking):
- A second selection of the same case within the ceiling does not call the fetcher again.
- **An entry fetched at 01:50 is not served at 02:06.** This is the batch-boundary test and
  the reason the expiry is not a rolling TTL.
- An entry fetched at 09:00 is not served at 09:31 — the ceiling.
- Advancing the clock alone triggers no fetch, and no timer is registered. Proves no polling.
- A failed fetch is not cached, so the next selection retries.

## Verification

1. `make build && make test && make lint` from the repo root, output pasted. `mvn test` runs
   `*IT.java` under surefire, so the integration test is not opt-in. Note `make lint` is
   `tsc --noEmit` only — nothing lints Java in this estate, so the Java conventions in
   `onboarding-core/CLAUDE.md` are review-enforced.
2. `make screening-run` against `local/`, then confirm `case_stage` holds the six open cases
   and the stage file is byte-identical to before.
3. Run it twice on consecutive days (clock-shifted) and confirm the expected date does not
   move — the behaviour change this plan exists for.
4. `make run-core` (local profile, H2, seeded) and `make run-workspace`, then Playwright MCP
   to `http://localhost:5173`, screenshot, and **read the screenshot**. A panel that shows
   raw `EDD_PENDING`, an empty stage or a leaked name is only visible by looking. Per
   `rules/web-verification.md` an appearance claim closes only on an image I have viewed.
5. With the workspace open, click through all eight local cases and back again, and confirm
   from onboarding-core's request log that each case was fetched once and re-selection issued
   no second request. The cache is a capacity control, so it gets exercised, not just
   unit-tested — a green cache test next to a cache that never hits is the failure mode.
6. `curl` the endpoint with `X-Norrbank-Roles: RM` for a case belonging to another RM and
   confirm 404 — the authorisation hole the existing template would have handed us.

## What I chose not to do

- **Not read the stage file from onboarding-core**, and not recompute the stage there.
  The first puts a synchronous request behind a locked flat file on another host; the second
  duplicates `ScreeningRules`, is forbidden by `onboarding-core/CLAUDE.md:21`, and would be
  changing how stage is decided — out of scope.
- **Not write the RM-facing copy.** Placeholders that fail a test, as above.
- **Not fix `LocalDate.now()` / `Instant.now()` in `ScreeningBatchJob`** (lines 53, 85),
  though they violate the estate's UTC rule and decide the date we are about to show an RM.
  The new table's date is computed from the anchored `stage_since`, so the new path is sound;
  changing the batch's clock handling in the same change as its first database write would
  double the blast radius of the riskiest step. Separate ticket.
- **Not make the stage file's date match the table's.** The anchored date goes to the new
  table only, leaving the ops console's data bit-identical. The two will disagree on the
  expected date. That is deliberate — the file is operations' surface and theirs to sign off
  — and it is the first follow-up I would raise with M. Lindqvist.
- **Not fix the missing ownership check on `GET /v2/cases/{caseId}`**
  (`CaseQueryController.java:48`). Pre-existing, and `secure-api-review@1.4` is in force, so
  it is raised here — but the new endpoint does the check properly rather than inherit the
  hole. Same for the browser setting its own `X-Norrbank-Roles` from a JS global
  (`api.ts:14`, `session.ts:30-36`): nothing in the repo asserts the gateway overwrites them.
- **Not add a server-side cache or ETags.** The client cache in step 6 addresses the traffic
  shape; adding conditional-request handling to a new endpoint as well is work I would rather
  see justified by a measurement than by a guess.
- **Not touch `v1/`** (frozen by ONB-3110 and by a `PreToolUse` hook), the corporate portal
  (C3), `deploy/` (platform-owned, and no onboarding-core route edit is needed anyway), or
  the several unrelated defects the sweep turned up — the broken `make registry-import`
  target, the zoneless `setTimestamp` in `ResultWriter.java:37`, `LocalDate.EPOCH` silently
  substituted for a null `updated_at`, dead `CaseToScreen.expectedDecisionDate`, the orphan
  `v1/CaseStatusView.java`, and the stale claim in `.claude/hooks/frozen-path.sh:33` that the
  workspace case list still pins v1. Listed so they are not lost.
