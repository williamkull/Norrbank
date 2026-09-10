---
description: Turn an accepted intent.md into spec.md, constrained by the organisation's skills, with areas of concern flagged
---

Read the attached intent.md and produce a requirements and design spec for integrating it
into our existing codebase. Apply the skills available to you so the plan conforms to our
brand guidelines, security policies and UX standards. Document the spec fully as spec.md,
ready to hand to the engineering team.
Describe clearly any areas of concern, especially where you cannot satisfy contradicting policies.

Write `spec.md` at the repository root with these sections, in this order:

- **Title and provenance.** `# Spec: <outcome>`, then the intent it came from, the Jira
  key, and a `Skills in force` line naming each skill you applied and its version from the
  skill's own frontmatter. Whoever reads this in a year must be able to tell which version
  of which policy produced it.
- **Outcome.** What is true when this is built, from the point of view of whoever benefits.
- **The change itself.** What is added or altered, at the level an engineer plans against:
  the surfaces involved, what they read, what they expose, what they do not.
- **Constraints carried from intent.md.** Numbered, in the originator's own terms, so a
  later section can cite one by number.
- **Areas of concern.** Numbered `C1`, `C2`, `C3`. One per concern, each with: the policies
  or constraints involved and the section of each; why they cannot all hold at once, or
  what is unresolved; the options with what each one breaks; your recommendation; and the
  named role who has to decide. Leave every one of them open — resolving a concern is the
  product owner's job with the policy owner, not yours.
- **Out of scope.** What this change deliberately does not do, including anything carried
  out of the intent's open questions.

Rules for the pass:

- Read the estate before you write. A concern you found by reading the code is worth more
  than one you inferred from the intent.
- Every applied skill is applied by section. When a skill decides something, cite it as
  `<skill> §<n>` so the reader can check you against the policy.
- A concern where two policies genuinely conflict is the point of this pass. State the
  conflict; do not pick a winner and do not soften either policy to make them fit.
- No implementation plan, no file list, no estimates. Plan mode does that next, and it
  reads this file.
- Do not write or change any file other than `spec.md`.
