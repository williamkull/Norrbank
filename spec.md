# Spec: retry a status that failed to load

From intent/retry-a-failed-status.md (ONB-2381). Author and product owner: William Kull.

Jira: ONB-2381
Skills in force: brand@3.2 · secure-api-review@1.4 · aml-compliance@2.0 · ux-workspace@1.1
Carries forward from the ONB-2140 spec (git history): the stage and procedure code
requirement, and the personal-data rule. Both are unchanged and listed under Constraints.

## Outcome

A relationship manager whose case status failed to load can ask for it again from the
Status panel, without leaving the case. They see the same status they would have seen had
the first request succeeded.

## Status panel

The Status panel is in one of three states. It is the only surface that changes.

| State | When | Shown |
|---|---|---|
| Loading | No status yet and no failure | "Loading." |
| Failed | The status request failed | "Status is unavailable right now." and a "Try again" button |
| Shown | A status has loaded | Stage with its procedure stage code, Next step, Expected date (or "Not yet known"), as today |

Copy is exact: "Status is unavailable right now.", "Try again", "Loading.". The existing
message is unchanged. No other text is added.

### Retry

- **One press, one request.** Pressing "Try again" makes exactly one new request for the open
  case and moves the panel to Loading. A failed request is never reused; the retry is a new
  request.
- **No second press.** The button is not shown while loading, so a second press cannot start
  a second request.
- **Outcome of the request.** Success: the panel moves to Shown. Failure: it returns to
  Failed, with the message and the button. A rate-limited answer (429) is a failure like
  any other.
- **Only on failure.** The button appears in Failed and nowhere else: not in Loading, not in
  Shown.
- **Per case.** A retry for one case does not change the state of another. A status that
  loaded is held per case and fetched once per case, as today. A failure is still not held.
- **Switching case.** If the RM selects another case during a retry, the panel shows the new
  case, not the old case's answer, and the old answer does not land in the new case's panel.
  The panel never shows, and the button never acts on, another case's state.
- **Nothing automatic.** No retry on a timer, no retry on focus or visibility, no repeated
  attempts. Only a press makes a request.

### Button

A native button with the browser's default look. No style is added. It is reachable and
operable by keyboard, and its accessible name is "Try again".

## Constraints

From intent.md:

1. The button appears only when the status failed to load. It is not shown while loading or
   once a status is shown.
2. One new request per press, for the open case. Nothing automatic: no retry, timers or
   refetch on focus.
3. A status that has loaded is still fetched only once per case.
4. The existing message text stays as it is.
5. The "Try again" button uses the browser's default look. No button style is added.
6. No change to the rest of the case view, and no new data, authentication or audit
   behaviour.

Carried from ONB-2140, unchanged:

7. Wherever the panel shows a stage, the procedure stage code is shown verbatim, with the
   plain wording as the stage (aml-compliance §7, ux-workspace §2). The Failed and Loading
   states show no stage and no code.
8. No personal data in the panel or the workspace session (aml-compliance §6, secure-api-review
   §4). The retry reads the same status as today and adds nothing to it. The expected date
   stays date-only.
9. The workspace session holds nothing beyond what the gateway forwards.

Checked and not in conflict: brand §1 and §5 (the button is the "what to do next" for the
failed state; no apology, no exclamation); ux-workspace §5 (the failed panel stays inside the
panel and the rest of the case view keeps working); aml-compliance §2 and §8 (a retry re-reads
a status, it recomputes nothing and changes no due-diligence state, so no audit record);
secure-api-review §3 (read-only call, no audit event). The default-styled button is a
decision of the run owner and is not treated as a conflict with ux-workspace §6.

## Acceptance checks

1. Status request fails → panel shows "Status is unavailable right now." and a "Try again"
   button.
2. Press the button → panel shows "Loading." and the status request for that case is made
   once more. Exactly one new request.
3. That request succeeds → panel shows stage with its procedure code, next step and expected
   date.
4. That request fails → message and button are shown again.
5. No button while Loading; no button once a status is shown.
6. A case whose status has loaded is not requested again on reselecting it.
7. Fail case A, switch to case B: B's panel shows B's own state; pressing the button in B
   requests B only.
8. Press retry on A, switch to B before it answers: A's answer does not appear in B's panel.
9. The button is reachable by Tab and operable with Enter and Space.
10. No request is made without a press (no timer, no focus refetch).

## Areas of concern

### C1 · Contradicting constraints — more calls to the status endpoint, no gateway change

- **Involved:** secure-api-review §6 ("If a change makes a client call an endpoint more often,
  the limit is part of the change and the platform team owns it"); intent constraint 6 and
  out of scope ("Any change to onboarding-core or the status endpoint"); the gateway route
  for onboarding-core, which holds the limit (50 requests a second, burst 10), is sized
  against the service's connection pool and changes only through a platform change request
  with the onboarding-core owner.
- **Why they do not both hold:** a retry makes the client call the status endpoint more often
  than today. §6 makes the limit part of this change. The intent excludes changes to the
  endpoint and gives no provision for the limit. The code's own comment on the status fetch
  says the limit is sized for the pool, not for demand.
- **Unresolved:** whether the limit still fits. The load added is bounded: one request per
  press, one press at a time, nothing automatic. No figure for expected retries exists.
- **Options:**
  1. Ship as scoped, with the platform team told. Breaks §6 if the limit is part of the
     change and has not been looked at.
  2. Ask the platform team to confirm the current limit covers the extra calls, as a
     recorded check, no limit change. Meets §6 if confirmed; adds a dependency before release.
  3. Raise the limit in this change. Breaks the intent's scope, and needs a platform change
     request and the onboarding-core owner.
- **Recommendation:** option 2.
- **Decides:** William Kull (product owner) with the platform team and the onboarding-core
  owner.
- **Status:** open.

### C2 · Contradicting standards — panel layout when the state changes

- **Involved:** ux-workspace §5 ("Loading does not shift the layout"); intent constraint 1
  (the button is shown only in Failed) and the "Loading." state it must return to.
- **Why they do not both hold:** Failed has a message and a button; Loading has one line. Pressing
  the button makes the panel shorter, and the case view below it moves up. The panel already
  shifts between Loading and Shown today, so §5 is not fully met now.
- **Options:**
  1. Accept the shift, as for Loading to Shown today. Breaks §5 in one more place.
  2. Hold the panel's height across the three states. Meets §5; touches panel layout and may
     need a style, which intent constraint 5 rules out for the button only.
  3. Keep the button in place and disable it while loading. Meets §5; breaks intent constraint
     1 and the acceptance criterion that the button is not shown while loading.
- **Recommendation:** option 1, and record that the existing Loading to Shown shift is the
  same defect, to be fixed once for the panel.
- **Decides:** William Kull (product owner) with Workspace design.
- **Status:** open.

## Out of scope

- Automatic retry, timers, and refetch on focus or visibility.
- Any change to onboarding-core or the status endpoint.
- Any change to the gateway rate limit (see C1) unless C1 is decided otherwise.
- Any change to the rest of the case view: Case, Contacts, case header and the case list.
- A style, icon or colour for the button.
- Different messages for different failures, or showing the reason a request failed.
- Client-facing visibility in the corporate portal, carried out of ONB-2140.
- Any change to how a case's stage is decided.
