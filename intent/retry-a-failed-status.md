# Intent: retry a status that failed to load

Author: Claude, for the reporter of ONB-2381 (RM workspace)
Status: draft
Jira: ONB-2381

## Problem

When the status service does not answer, the Status panel on the case view shows "Status is unavailable right now." and stays that way. The only way for a relationship manager to try again is to select another case and come back. Today the failed view is in `rm-workspace/src/onboarding/StatusPanel.tsx`.

## Proposed outcome

A relationship manager whose status failed to load can ask for it again from the Status panel, without leaving the case. While it loads the panel says "Loading.". On success it shows stage, next step and expected date as it does today. On failure the message and the way to try again come back.

## Affected users and systems

Relationship managers using the case view. rm-workspace only: the Status panel and its test. The status request is made as today through `rm-workspace/src/onboarding/api.ts`. onboarding-core and the status endpoint do not change.

## Constraints

- The way to try again appears only when the status failed to load. It is not shown while loading or once a status is shown.
- One new request per press, for the open case. Nothing automatic: no retry, timers or refetch on focus.
- A status that has loaded is still fetched only once per case.
- The existing message text stays as it is.
- No change to the rest of the case view, and no new data, authentication or audit behaviour.

## Open questions

1. For the product owner: the workspace has no button styles (`rm-workspace/src/styles.css` has only `.error` and `.subdued`), and adding some goes beyond the two files the issue names. Proposed answer: use a plain button with the browser's default look. Overrule this if the button should match a style we do not have yet.
