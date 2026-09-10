---
name: brand
description: Apply the Norrbank voice and terminology to anything a customer, a relationship manager or a colleague reads — screen text, error messages, notifications, documentation and specs.
version: "3.2"
---

# Norrbank voice and terminology

Owner: Brand and communications. Source of truth: the Norrbank tone of voice guide and the
group terminology list. This skill is the part that applies to text inside a product.

Norrbank is a corporate and institutional bank. The reader is at work, is competent, and is
in the middle of something. Write the way a good colleague talks: plainly, in ordinary
Swedish or English, with the point first.

## §1 Voice

- **Plain.** Ordinary words. "We are checking" rather than "verification is in progress".
- **Direct.** The point first, the qualification after, if at all.
- **Straight.** No enthusiasm, no exclamation marks, no apologising, no reassurance the
  reader did not ask for. A bank that sounds excited about a status panel sounds unserious.
- **Ours, not the system's.** "We" is Norrbank. "You" is the reader. The software is never
  a character and never speaks about itself.

## §2 Terminology

Use the group's words, everywhere and consistently. The ones that come up most:

| Use | Not |
|---|---|
| client | customer, account, party (for the client's own organisation) |
| case | application, ticket, file (for the onboarding case) |
| onboarding | KYC onboarding, client take-on |
| relationship manager, RM | account manager, client manager |
| beneficial owner | UBO, owner (in anything a reader sees) |
| stage | status, state, phase (for where a case has reached) |

A word on this list is not swapped for a synonym to avoid repeating it. Repetition is
cheaper than ambiguity.

## §3 Sentences on screen

Sentences, capitalised normally, no full stop on a label or a single-line value. Nothing in
upper case for emphasis. No abbreviation the reader would have to expand, except `RM` and
`KYC`, which are used internally and never on a client-facing surface.

## §4 Numbers, money and dates

Amounts carry their currency. Dates are written out, not numeric strings. Nothing on screen
shows a system format — no ISO timestamps, no zero-padded internal identifiers, no enum
names. A case number is shown as operations writes it.

## §5 Errors and empty states

An error says what happened, in the reader's terms, and what to do next. It does not blame
the reader, does not apologise, and does not expose an internal identifier, stack trace or
system name. If there is nothing the reader can do, say who is handling it.

An empty state says why it is empty. "No cases yet" is finished; "No data" is not.

## §6 Where this stops

Brand does not override a regulatory, security or compliance requirement. Where a policy
requires an exact code or an exact form of words, that wins — write the plain wording
around it rather than instead of it, and raise the conflict rather than quietly resolving
it in brand's favour.
