# Intent: retry a status that failed to load
Author: not named in ONB-2381 (to be set by the originator). Status: draft. Jira: ONB-2381

## Problem

When the status service does not answer, the Status panel on the case view says "Status is
unavailable right now." and stays that way. The only way to try again is to select another
case and come back. A relationship manager with a client waiting on an answer has to
discover that trick, or give up and ring operations for the status instead.

## Proposed outcome

When a status has failed to load, the relationship manager can ask for it again from the
panel itself, with a "Try again" button, and see the stage, next step and expected date as
soon as the service answers. If it fails again, they are back where they started and can
try once more.

## Affected users and systems

Relationship managers using the case view. The RM workspace only. The status service and
onboarding-core are not part of this change.

## Constraints

- The button reads exactly "Try again", and appears only when the status failed to load:
  not while loading, not once a status is shown.
- Pressing it shows "Loading." and makes one new request for the open case.
- A retry happens only when a person presses the button. No automatic retry, timers or
  refetch on focus.
- A status that has loaded is still fetched only once per case.
- A failure stays inside the panel, shows no technical error, and leaves the rest of the
  case view unchanged.
- No change to the status endpoint or to onboarding-core.

## Open questions

None. The acceptance criteria in ONB-2381 do not conflict, and nothing here needs a
decision from anyone else before the design pass.
