# Intent: The ONB-2140 status panel has a test plan, and its one test gap is closed
Author: William Kull (Onboarding platform), drafted with Claude. Status: draft. Jira: ONB-2360

## Problem

The Status panel from ONB-2140 is built, but no `test-plan.md` exists for it. The nearest list is "Tests that prove it" in `docs/changes/ONB-2140/plan.md:253-292`: 23 cases. It was written before the build, and the built code differs from it in four places and has no cache expiry at all.

Today 16 of the 23 cases have a test, 3 have part of one and 4 have none. Nobody can say which is which without reading the code. A reader who trusts the plan will expect tests for behaviour that does not exist.

The platform check runs only the front-end tests. A pass says nothing about the 13 backend cases.

## Proposed outcome

An approved `test-plan.md` that says, for each of the 23 cases, which test covers it or why none does. Then the one front-end gap that can be closed here is closed (by two test files, see the amendment under "In scope"): when the status cannot be fetched, the failure shows inside the panel and the rest of the case view is still there (plan case 18).

**In scope**

- `docs/changes/ONB-2360/test-plan.md`, written from plan.md:253-292 and corrected by `code-map.md`. William Kull approves it before any test is written.
- One new test, plan case 18, rendering the case view with a failing status. **Amended 2026-10-13:** case 18 has two test files, not one: the first (a 500 from the status fetch) and `CaseView.statusFailed.independent.test.tsx` (a rejected fetch), written by the independent tester in the Test stage. William Kull decided to keep it. Still one case, no other case gets a new test.
- Cases 14-17, 19, 22 and 23 cited to their existing tests, not rewritten.
- The four differences between plan and code recorded as accepted: the `stage` value, the answer for a case with no stage row, date precedence, and no date at `REGISTRY_COMPLETE`.

**Out of scope, with the reason**

- Cases 5, 6, 7 and 8 (Java gaps). Java cannot run in this worktree, and cases 5 and 6 would need `ScreeningBatchJob.run` under test.
- Cases 20 and 21. The panel cache has no expiry (`StatusPanel.tsx:132`), so they cannot pass.
- Java, Playwright and Selenium tests. They are listed in the test plan, not written.
- Any production code change. A fault a test exposes is recorded in `docs/changes/ONB-2360/` for a new issue, and not fixed here.

**Done when**

1. `test-plan.md` is committed and approved.
2. The case 18 test passes under `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test`.
3. All 23 plan cases are accounted for in `test-plan.md` as cited, written, or left out with a reason.

## Affected users and systems

- The Onboarding platform and Workspace teams, who own the panel and its tests.
- `rm-workspace`: the status panel and the case view, tests only.
- `onboarding-core` and `screening-batch`: read to write the plan. Not changed.

## Constraints

- Vitest in `rm-workspace` only. No production code changes.
- The built code is the contract. Tests pin what it does, not what the plan said.
- The label wording in `rm-workspace/src/shared/formatting.ts:37-53` is not approved. Tests assert that each code has a label that is not the fallback, never the wording.
- Only gaps get a new test. Existing tests are cited, not copied.
- Front-end fixtures are built from the status type, which has no name field. No beneficial-owner or director name appears in them.

**Risks carried forward**

- The cache never expires, so a workspace left open past 02:00 shows the previous day's stage until reload. Cases 20 and 21 stay unwritten until a new issue adds expiry.
- The platform check does not run the backend cases, so a green check says nothing about cases 1-13.
- Cases 7 and 8 stay partly covered. The built date rule is pinned by no new test.

## Open questions

None open. William Kull answered the scope questions on 2026-10-13, including the conflicts between answers 2A, 3A and 8A, and approved one new test as the outcome. Amended 2026-10-13: he later decided to keep a second test file for the same case 18, so the outcome is two files for one case.
