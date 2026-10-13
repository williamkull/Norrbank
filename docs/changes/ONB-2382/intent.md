# Intent: The case list never says "No open onboarding cases." unless it is true
Author: Relationship manager, Corporate Banking, Stockholm (reporter), drafted with Claude. Status: draft. Jira: ONB-2382

## Problem

When the case service is slow or does not answer, the Onboarding list in the RM workspace says "No open onboarding cases." That is not true. The cases are there; the list has not loaded.

An RM who reads that sentence assumes their cases are gone. They stop and look for the cause instead of working their clients.

On an error the list also shows a technical message, "/v2/cases responded 503", with the same false sentence directly under it.

The sentence also shows for a moment every time the workspace opens, before the cases have arrived. So an RM sees it on every visit, not only when something is broken.

## Proposed outcome

An RM can trust what the Onboarding list says. While the cases load, the list says "Loading." and nothing else. If they cannot be loaded, it says "Cases are unavailable right now." in plain wording, with no path or status code. "No open onboarding cases." appears only when the service has answered and the answer is an empty list.

When the cases do load, the list and the first case open as they do today.

## Affected users and systems

- Relationship managers in Corporate Banking, who read the Onboarding list.
- The RM workspace, in the Onboarding list.
- The case service is the source of the answer. It is read, not changed.

## Constraints

- No retry button and no automatic retry for the case list.
- No change to onboarding-core or the cases endpoint.
- No change to the Status panel.
- The three sentences use the wording above, word for word.
- A failed list shows no technical error: no path, no status code, no system name.
- Loading does not shift the layout.
- No new colours, sizes or card styles.
- The terms "case" and "client" follow the group's terminology.
- No money movement, authentication or personal data is involved.

## Open questions

1. Brand v3.2 §3 says no full stop on a single-line label or value. The issue's three sentences, and the existing Status panel wording, end with a full stop. Working assumption: the issue's wording stands. Who decides: the brand owner.
2. The right pane says "Select a case." today. The issue does not say what it shows while the cases are loading or after they fail to load. Who decides: the reporting RM together with the Workspace team.
