# Spec: onboarding status for relationship managers

From intent.md (ONB-2140). Three areas of concern raised for resolution.

Jira: ONB-2140
Skills in force: brand@3.2 · secure-api-review@1.4 · aml-compliance@2.0 · ux-workspace@1.1

## Outcome

A relationship manager opening a case in the workspace sees where that case actually
stands, what happens next, and when it is expected to complete, without ringing
onboarding operations.

## Status panel

One panel per open case, on the existing case view. It shows:

- **Stage** — where the case is now.
- **Next step** — what the case is waiting on.
- **Expected date** — when the case is expected to reach a decision, where one is known.

It reads a v2 status endpoint behind the existing SSO gateway JWT. It adds nothing to the
workspace session.

## Constraints carried from intent.md

1. No new personal data in the workspace session.
2. Existing SSO only. No new identity, no new role.

## Areas of concern

### C1 · Contradicting policies — stage wording

`ux-workspace` §2 requires a plain-language stage ("We are verifying the owners").
`aml-compliance` §7 requires the KYC procedure's stage code verbatim (for example
`EDD-PENDING`), because the four-eyes approval and the audit trail carry that code.

One label cannot satisfy both. Options: plain wording only (breaches `aml-compliance`);
code only (breaches `ux-workspace`); plain wording with the code beneath it.

**Decision needed** — product owner, with both policy owners.

### C2 · Personal data — expected date on registry-pending cases

Expected date for cases waiting on registry evidence is derived from `registry-link` rows,
which carry beneficial-owner names. Surfacing the row unfiltered puts a name into the RM
session, against constraint 1 and KYC need-to-know.

Recommended: date only, the name stripped at the projection rather than at the panel.

**Decision needed** — data-protection owner.

### C3 · Open question carried from intent.md

Client-side visibility in the corporate portal. No skill resolves it; nothing in this spec
depends on it.

Recommended: out of scope for this change, and a candidate for a separate intent.md.

**Decision needed** — product owner.

## Out of scope

- Any change to how a case's stage is decided. This change reports stage; it does not
  define it.
