# ONB-2381 — Retry a status that failed to load

## Context

When the status request fails, the Status panel shows "Status is unavailable right now."
and stays that way. The only way out is to select another case and come back. The accepted
spec (`spec.md`) adds one native "Try again" button to the failed state. One press, one new
request, for the open case. Nothing automatic.

How the code works today (`rm-workspace/src/onboarding/StatusPanel.tsx`):

- `StatusPanel({caseId})` calls `useCaseStatus(caseId)`, defined in the same file. It returns
  `{status, failed}`. Loading is inferred as `status === null && !failed`.
- Two module-level maps: `held` (answers, kept for the page's life) and `inFlight` (requests
  in the air, so two mounts of one case share one request). A success goes into `held`. A
  failure is not kept.
- One effect on `[caseId]` resets state, returns the held answer if there is one, otherwise
  joins or creates the `inFlight` request. A `showing` flag stops a late answer reaching a
  panel that unmounted or moved on.
- `CaseView.tsx:20` renders `<StatusPanel caseId={...}/>` with no `key`. The panel stays
  mounted across case changes, and today the old case's state can render for one frame
  before the effect resets it. Checks 7 and 8 need that closed. `CaseView` is out of scope,
  so it is closed inside `StatusPanel.tsx`.

Decided before this plan, not reopened: `StatusPanel.tsx` and its test only; native
`<button type="button">` "Try again", default look, failed view only; existing copy
unchanged; no automatic retry; the rate limit is unchanged (C1, platform confirmation
requested, not yet received); layout shift on retry accepted (C2).

## Files that change

### 1. `rm-workspace/src/onboarding/StatusPanel.tsx`

**State is keyed to the case it belongs to.** Replace the two `useState` calls with one:

```ts
interface Loaded { caseId: string; status: CaseStatus | null; failed: boolean; attempt: number }
const [entry, setEntry] = useState<Loaded | null>(null);
```

Derive what to show during render, from the `caseId` prop:

```ts
const mine = entry?.caseId === caseId ? entry : null;
const status = held.get(caseId) ?? mine?.status ?? null;
const failed = status === null && (mine?.failed ?? false);
const attempt = mine?.attempt ?? 0;
```

An entry written for another case is never read. This is how checks 7 and 8 are met: the
render for case B cannot see A's status, A's failure or A's attempt count, on the first frame
or later. There is no reset step, so there is no frame to leak. Reset-during-render and
`key` were the alternatives; `key` is out (it lives in `CaseView`), and reset-during-render
is a second `setState` pattern in a file that has none. Tagging the state is less code and
cannot be forgotten.

**Retry is a callback that bumps an attempt counter in state, and the counter is an effect
dependency.** The hook returns `{status, failed, retry}`.

```ts
const retry = useCallback(() => {
  setEntry((prev) =>
    prev && prev.caseId === caseId && prev.failed
      ? { caseId, status: null, failed: false, attempt: prev.attempt + 1 }
      : prev);
}, [caseId]);
```

One state write does both jobs. `failed` goes false and `status` null, so the next render
shows "Loading." before any request starts, and `attempt` changes, so the effect re-runs.

**The effect** runs on `[caseId, attempt]`:

1. If `held.has(caseId)`, return. The render already shows it. A loaded status is never
   fetched again (check 6).
2. Join `inFlight.get(caseId)` or create the request.
3. On success, `setEntry({caseId, status, failed: false, attempt})`. On failure,
   `setEntry({caseId, status: null, failed: true, attempt})`. Both only `if (showing)`.
4. Cleanup sets `showing = false`.

The effect no longer calls `setState` on entry, so the old `setFailed(false)` /
`setStatus(null)` reset goes away.

**Creating the request.** Put the bookkeeping on the promise that goes into `inFlight`, so it
runs before any panel hears the outcome:

```ts
pending = fetchCaseStatus(caseId)
  .then((loaded) => { held.set(caseId, loaded); return loaded; })
  .finally(() => inFlight.delete(caseId));
inFlight.set(caseId, pending);
```

Today the clean-up is a separate chain, a few microtask hops behind the panel's own
handler. A retry that landed in that gap would join the request that just failed, and
"a failed request is never reused" would be false. With the clean-up on the stored promise,
`inFlight` is already empty when the panel shows the failure. Every consumer attaches its own
`.then(onOk, onFail)`, so the stored promise's rejection is always handled.

**The failed view** gains the button, under the existing message:

```tsx
<p className="error">Status is unavailable right now.</p>
<button type="button" onClick={retry}>Try again</button>
```

Loading and shown views are unchanged. The doc comment on `useCaseStatus` gets one sentence:
a press is the only thing that asks again.

**A double press is impossible**, on two counts. The button exists only in the failed view,
and the first press moves the panel to Loading, which removes it (check 5). If two clicks
were ever delivered before that render, the second updater sees `prev.failed === false` and
changes nothing, so no second attempt and no second request.

**Retry and `inFlight`.** A retry always finds `inFlight` empty for its case, because the
request that failed has already cleared itself (above). So it creates a new request. If
something else did start one for the same case, the retry joins it. That is still one
request, not two.

**Retry and `showing`.** Each attempt is its own effect run with its own `showing` flag. The
attempt counter changes, the old run's cleanup fires, and only the new run may write.
Case switch during a retry on A:

- A's cleanup sets `showing = false`. A's answer does not write to the panel.
- If A's request succeeds anyway, `held` keeps it (correct for A, and returning to A shows
  it without a request). If it fails, nothing is kept.
- B's render sees no entry for B: "Loading.", no button. B's effect makes B's one request.
- Even if a stale write got past `showing`, the entry carries A's id and B's render ignores
  it (check 8 has two guards).
- Switching back to A while A's retry is still in the air joins that request. Still one.

### 2. `rm-workspace/src/__tests__/StatusPanel.test.tsx`

Existing tests stay as they are. Add three local helpers beside `respondWith`, in its style,
all via `vi.stubGlobal("fetch")` and returning the `vi.fn`:

- `failOnceThenRespondWith(status)` — first call answers 500, every later call answers 200.
- `routeByCase(routes)` — routes on the `/v2/cases/{id}/status` URL to a per-case handler, so
  a test can answer A and B differently and read which case each request was for.
- `deferredResponse()` — returns `{ response, resolve, reject }`, so a test controls when a
  request answers (to hold a retry or a first load in the air).

Each new test uses its own case id, `ONB-2026-000806` upward, because `held` and `inFlight`
leak between tests. Tests use `fireEvent.click`, `toBeDefined()` and `queryBy…` for absence;
there is no jest-dom and no userEvent.

| Test | Spec check |
|---|---|
| failed status shows the message and a "Try again" button | 1 |
| pressing "Try again" shows "Loading." and makes exactly one more request (two calls in all, to the same URL) | 2 |
| a second click on the button right after the first adds no request | 2 |
| a retry that succeeds shows stage, procedure code, next step and expected date, and no button | 3 |
| a retry that fails shows the message and the button again, and a further press makes a third request | 4 |
| no button while the first load is in the air | 5 |
| no button once a status is shown | 5 |
| a status that loaded after a retry is not fetched again when the case is reselected (unmount, remount: call count stays at two) | 6, constraint 3 |
| a failed status is not held: remounting the case asks again | 6, spec "Per case" |
| fail A, `rerender` to B with B held in the air: B shows "Loading." with no A message and no button; B then answers and shows B's status | 7 |
| fail A, switch to B (also failing), press in B: the new request is for B, A is not requested again | 7 |
| press retry on A, `rerender` to B, then answer A: A's status never appears in B's panel, and B's own answer does | 8 |
| the button is a `BUTTON` with `type="button"` and role/name "Try again" | 9 |
| after a failure, a focus event, a `visibilitychange` event and a minute of fake-timer time add no request | 10 |

Check 9 in the browser (Tab, Enter, Space) is native behaviour that happy-dom does not
simulate. The test pins the element and its name; the keyboard itself is checked by hand, see
Verification.

### 3. `rm-workspace/src/__tests__/StatusPanel.retry.independent.test.tsx` (added later)

Not in the plan as first written, which named two files. The independent test step added it,
beyond those two. It is kept as a check written apart from the author's, and is not edited
by the author.

Nothing else changes: no `api.ts`, no `CaseView.tsx`, no CSS, no `shared/`, no
onboarding-core, no e2e.

## Order of work

1. Refactor the hook with no behaviour change: tagged `entry` state, derivation in render,
   effect on `[caseId, attempt]` with `attempt` always 0, the `inFlight` bookkeeping moved
   onto the stored promise. `retry` not wired. Run the existing tests; they must stay green.
2. Add `retry` and the button in the failed view.
3. Add the three helpers and the tests above. Check that the new tests fail against step 1's
   code (no button) and pass after step 2.
4. Run lint and test, then the by-hand keyboard check.

## Risks

- **Step 1 changes shared code, not only the failed view.** The `inFlight` and render-time
  derivation changes touch the path every status load takes. The existing "does not fetch a
  case it has already loaded" test and the new reselect tests guard it. This is the step to
  review hardest.
- **Single state slot.** `entry` holds one case at a time. Switching away and back to a
  failed case shows "Loading." and makes a new request. That is how it works today and what
  the spec's "Per case" lines allow. It is not a regression, but a reviewer may expect the
  failure to be remembered. The effect cleanup clears a failed entry for the case being left
  (a press has already cleared `failed`, so a retry is not undone). Without that, returning
  to A before B answered showed A's old failure and button while the effect had already
  asked again, against checks 5 and 10. There is a test for it.
- **Rate limit (C1).** More calls to the status endpoint are possible. The load is bounded:
  one request per press, one press at a time. The platform team's confirmation has been
  requested and not received. It is a release dependency, not a code dependency. Do not ship
  before it arrives.
- **Layout shift (C2).** The panel gets shorter when the press moves it to Loading. Accepted.
- **Rejections.** The stored `inFlight` promise now rejects. Each consumer handles it. A
  future consumer that forgets would raise an unhandled rejection. The code comment says so.
- **Not run.** This plan is from reading the code. Nothing has been built or run.

## Verification

From the repository root:

1. `cd rm-workspace && bun install --frozen-lockfile && bun run lint && bun run test`
   (`lint` is `tsc --noEmit`). Paste the output.
2. The root `make build`, `make test` and `make lint` are required by the repository
   `CLAUDE.md` before a task is reported complete. Run them too and paste the output.
3. By hand, with the workspace running against a status endpoint that can be made to fail
   (or with the request blocked in the browser's network panel): open a case, see the
   failure, press "Try again" with the mouse, then again with Tab and Enter, then Tab and
   Space. Look at a screenshot of each state. Check 9 stays unverified until this is done.

## What I chose not to do

- **No `key={caseId}` on the panel.** It would fix the leaked frame, but it lives in
  `CaseView.tsx`, which is out of scope.
- **No retry state kept per case.** A map of failures per case adds memory of failures the
  spec says are not held.
- **No disabled-while-loading button.** The spec says the button is absent while loading.
- **No debounce or lock around the press.** Absence of the button while loading is the lock;
  a timer would be a new moving part.
- **No timers, focus or visibility refetch, backoff or repeated attempts.** Out of scope.
- **No different messages for different failures, no reason shown, no 429 handling.** A 429
  is a failure like any other.
- **No change to `api.ts`, the gateway rate limit, `CaseView`, CSS, `shared/formatting.ts`,
  onboarding-core or e2e.**
- **No change to what `held` stores or how long it lives.**
