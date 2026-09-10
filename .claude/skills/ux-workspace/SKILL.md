---
name: ux-workspace
description: Apply the relationship-manager workspace UX standard. Use when adding or changing anything an RM sees — a panel, a label, a state, an empty view, an error.
version: "1.1"
---

# RM workspace UX

Owner: Workspace design. Source of truth: the workspace pattern library. This skill is the
part of it that a session building a screen has to honour.

The reader is a relationship manager between two client calls. They are not an onboarding
analyst, they have not read the KYC procedure, and they are looking at this screen to
answer a question a client just asked them on the phone.

## §1 One question per surface

Every panel answers one question and says which one. A panel that shows three unrelated
things is three panels. If you cannot write the question the panel answers in six words,
the panel is not designed yet.

## §2 Say the state in plain language

**A state shown to a relationship manager is written in plain language, in words the RM
could repeat to a client without translating them.** "We are verifying the owners", not
`UBO_UNCONFIRMED`. "Waiting for documents from the client", not `DOCS_REQUESTED`.

Rules that follow from that:

- No system enum names, no upper-case constants, no underscores on screen.
- No internal codes as the primary label. A code may appear as secondary information
  beneath the plain wording where another policy requires it, in a smaller, quieter
  style, never as the thing the RM reads first.
- Plain wording describes what is happening, from the client's side of it. Prefer "we
  are", "waiting for", "expected by".
- The same state uses the same words everywhere in the workspace. A state that is worded
  two ways is two states to the reader.

## §3 Always say what happens next

A state on its own leaves the RM with nothing to tell the client. Every state carries the
next step and, where one is known, the date it is expected by. Where no date is known, say
so plainly rather than leaving the field blank or showing a placeholder.

## §4 Dates

Dates are shown as dates the reader can say out loud, in the workspace locale. No
timestamps, no time zones, no ISO strings on screen. A date the system is not confident in
is not shown as if it were.

## §5 Empty, loading and failed

Every panel has all three. Loading does not shift the layout. Empty says why it is empty
and what would fill it. A failed panel says the information could not be fetched and
leaves the rest of the case view working; it never blanks the page and never shows the
reader a technical error.

## §6 Density and placement

The case view is read in seconds. A new panel earns its space or it does not go on the
case view. Do not introduce a new colour, a new type size or a new card style: use the
pattern library's.

## §7 Nothing the reader may not see

The workspace is behind SSO but it is not a KYC surface. If a value would only make sense
to someone inside the KYC function, it does not belong here — and check §6 of the AML
compliance skill before showing anything derived from screening or ownership data.
