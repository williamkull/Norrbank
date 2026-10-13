# ONB-2382 — The case list says only what is true

## Context

`App.tsx` keeps `cases` (starts as `[]`) and `error` (a string) as two separate pieces of
state, and always renders `CaseList`. `CaseList` shows "No open onboarding cases." for any
empty array. So "not loaded yet", "failed" and "answered with nothing" all look the same, and a
failure also prints `error`, which is `api.ts`'s "/v2/cases responded 503".

The fix is in the front end only. Wording is fixed by the issue: "Loading.", "Cases are
unavailable right now.", "No open onboarding cases." Read from the code on 2026-10-13; nothing
has been built or run (see `code-map.md`).

## The shape of the load state

One state in `App.tsx`, replacing `cases` and `error`:

```ts
type CaseLoad =
  | { state: "loading" }
  | { state: "failed" }
  | { state: "loaded"; cases: CaseSummary[] };
```

It starts as `loading`. The failure carries no message, so nothing technical can reach the
screen. `CaseList` is only rendered when the state is `loaded`, so its empty sentence can only
mean "the service answered with an empty list".

Why this over the alternatives: two booleans (`loading`, `failed`) allow impossible
combinations and keep `cases = []` meaning two things; `cases: CaseSummary[] | null` plus a
flag still needs a third value for failure. A union has exactly the three states the issue
names. I did not put the state into `CaseList`'s props: `CaseList` keeps its current props, so
its two tests stay as they are, and the one place that knows about loading is `App`.

## Files that change, in order

### 1. `rm-workspace/src/App.tsx`

1. Add the `CaseLoad` type (local, not exported) and one `useState<CaseLoad>({ state: "loading" })`.
   Remove the `cases` and `error` states.
2. The effect keeps one call to `fetchCases()`:
   - success: `setLoad({ state: "loaded", cases: loaded })` and
     `setSelectedCaseId((current) => current ?? loaded[0]?.caseId ?? null)` in the same
     callback, unchanged, so the first case still opens in one render;
   - failure: `setLoad({ state: "failed" })`. The caught error is not read or logged to the
     screen.
3. `selected` is found only when `load.state === "loaded"`.
4. In `<aside className="cases">`, after the `<h2>`, remove the `error` line and render by state:
   - `loading`: `<p className="subdued">Loading.</p>`
   - `failed`: `<p className="error">Cases are unavailable right now.</p>`
   - `loaded`: `<CaseList cases={load.cases} … />` as today.
5. Right pane (line 42): see Decision 2. Until decided, the line stays as it is.

### 2. `rm-workspace/src/__tests__/App.caseList.test.tsx`

Add tests (below). The three existing tests are kept word for word: they are correct and
should now pass.

No other file changes.

## What each state shows

| State | The list shows | Class | Right pane |
|---|---|---|---|
| loading | "Loading." | `.subdued` | "Select a case." (Decision 2) |
| failed | "Cases are unavailable right now." | `.error` | "Select a case." (Decision 2) |
| loaded, empty | "No open onboarding cases." (from `CaseList`) | `.empty` | "Select a case." (as today) |
| loaded, cases | the table; first case selected | — | `CaseView` of the first case |

Classes are the existing ones in `styles.css:46-48`, used as `StatusPanel.tsx:14-31` uses
them. No CSS change. Layout: the line sits in the same `<aside>` under the same `<h2>`, and
the pane is not touched, so the left column and the heading do not move; only the line is
replaced by the table when the cases arrive.

## Tests

Existing tests that change: none.

- `CaseList.test.tsx` stays as is. Both tests are still true: `CaseList` is only reached with
  an answered list.
- The three tests in `App.caseList.test.tsx` stay as is.

New, in `App.caseList.test.tsx`, using its `settle()` helper and `vi.stubGlobal("fetch")`:

| Test | Checks |
|---|---|
| while `/v2/cases` has not answered, "Loading." shows, and neither other sentence nor a table | requirement 1 |
| on 503, "Cases are unavailable right now." shows | requirement 2 |
| on a network failure (`mockRejectedValue(new TypeError("Failed to fetch"))`), the same sentence shows and "Failed to fetch" does not | 2 |
| on 200 with `[]`, "No open onboarding cases." shows, and "Loading." and the unavailable sentence do not | 3 |
| on 200 with one case, the row renders, "Loading." is gone, the row has class `selected`, and the case's `legalName` shows in the right pane | 4 |

Notes for the writer of the tests:

- The loaded test mounts `CaseView` and so `StatusPanel`, which asks the same stubbed `fetch`
  for `/v2/cases/{id}/status`. Route on the URL: the exact path `/v2/cases` gets the list; the
  status path gets a valid status body, or the panel shows its own failure.
- `StatusPanel`'s `held` and `inFlight` maps live for the whole file. Give each test that
  loads cases its own case id (`ONB-2026-000901` upward). The empty-answer test mounts no
  `CaseView`, but should use no shared id either.
- No jest-dom; use `toBeDefined()` and `queryBy…` for absence, as the existing tests do.
- Check the new tests fail on today's code and pass after step 1.

## Not changed, on purpose

- `api.ts` and its "responded 503" message. The list stops showing it; the Status panel shares
  `get()`.
- `CaseList.tsx` and `StatusPanel.tsx`, and `CaseView.tsx`.
- `styles.css`, `shared/formatting.ts`.
- No retry button, no automatic retry, no timeout for a slow service. A list that never
  answers stays on "Loading." (out of scope).
- onboarding-core, the cases endpoint, `deploy/`, the e2e suites. Neither e2e suite asserts on
  the sentence (`code-map.md` §3.5).
- The StrictMode double request in dev. Both answers are the same.

## Decision for the architect: full stops

Brand v3.2 §3 says no full stop on a single-line label or value. The issue's three sentences,
and the Status panel's "Loading." and "Status is unavailable right now.", all end with one.

- A. Follow the issue word for word. The list then matches the panel beside it.
- B. Drop the full stops to follow §3. The list then differs from the panel, or the panel
  must change, which is out of scope.

Recommendation: A. The wording is fixed in the issue and the panel already sets the pattern.
I found no reason in the code to depart from it. If the brand owner rules for B, it is three
strings in `App.tsx` and one in `CaseList.tsx`.

## Decision for the architect: the right pane while loading and after a failure

Today it shows "Select a case." The issue is silent.

- A. Leave it. No code. But it asks the RM to select from a list that has nothing to select,
  both while loading and after a failure.
- B. Smallest change that tells no untruth: show "Select a case." only when the state is
  `loaded`; render nothing in the pane while loading or failed. One condition on line 42, no
  new sentence, no new class. The pane is empty for a moment, which is not a layout shift
  (the pane has no content to move).

Recommendation: B. It adds no wording and removes the one instruction that cannot be followed.
It also needs one test: no "Select a case." while loading or after a failure. If the answer is
A, nothing is added.
