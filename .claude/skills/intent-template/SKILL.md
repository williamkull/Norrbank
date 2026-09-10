---
name: intent-template
description: Write an intent.md — the committed proto-spec that starts a change at Norrbank. Use whenever someone describes something they want built, changed or fixed and no intent exists yet.
version: "1.0"
---

# Writing an intent

Owner: Engineering practice. An intent is where a change starts. It is written by the
person who wants the thing, with Claude, and committed to `intent/` before anyone
specifies or builds anything. It is not a ticket and it is not a specification.

The originator is usually not an engineer. Do not ask them for a design, a field list, an
API or an estimate. Ask them what is happening today, what they want instead, and what
must not change. Everything else is someone else's job.

## The file

Name it after the outcome, not the system: `intent/onboarding-status-for-rms.md`, not
`intent/onboarding-core-change.md`. Then use these sections, in this order, all of them:

```markdown
# Intent: <outcome in a phrase>
Author: <name> (<function>). Status: draft. Jira: <key>
## Problem
## Proposed outcome
## Affected users and systems
## Constraints
## Open questions
```

## What goes in each

**Problem.** What happens today and who it costs. Concrete, from the originator's own
work: who does what, how often, and what it displaces. Not "there is no visibility" but
what someone does instead because there is none.

**Proposed outcome.** What is true when this is done, in one or two sentences, from the
point of view of the person who benefits. Not a solution and not a screen. If the
sentence names a technology, it is in the wrong section.

**Affected users and systems.** The functions whose work changes, and the systems that
are likely to be involved. A best guess is fine and being wrong here is cheap — this
section tells the design pass where to start reading, and the design pass corrects it.

**Constraints.** What must still be true afterwards. Policy limits, data that may not
move, identity and access that may not change, anything already decided elsewhere. Write
the constraint, not the reason.

**Open questions.** What the originator genuinely does not know or cannot decide alone,
each one addressed to whoever can answer it. An open question is a normal part of a
finished intent. Leaving it out to look decisive is what costs a rewrite later.

## Rules

- Under a page. An intent that runs to three pages is a specification written by someone
  who was not asked for one.
- No solution. No schema, no endpoint, no screen layout, no library.
- Every claim is the originator's own, and none of it is invented to fill a section. An
  empty Open questions section says "none"; it does not get padded.
- The Jira key goes in the header, and the Jira item carries the commit SHA once the
  intent is merged. Linkage both ways is the minimum bar.
- Status is `draft` until the accountable owner accepts it, then `accepted`. Acceptance
  is a merge by a named human, and that merge is what starts the design pass.
