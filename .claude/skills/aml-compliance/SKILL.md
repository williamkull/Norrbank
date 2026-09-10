---
name: aml-compliance
description: Apply the KYC and anti-money-laundering procedure to anything that reads, writes, records or displays a case's screening state, approval state or stage. Use when building or reviewing onboarding case functionality.
version: "2.0"
---

# AML and KYC compliance

Owner: Financial crime prevention. Source of truth: KYC procedure 4.2 and the group AML
policy. This skill states the parts of that procedure a system has to honour. Where the
two disagree, the procedure wins and this file is wrong.

## §1 What the procedure governs

Customer due diligence on a corporate onboarding case: identification of the legal
entity, its directors and its beneficial owners, screening against sanctions and PEP
lists, enhanced due diligence where risk requires it, and the approval that closes the
file. Every one of those steps is evidenced, and the evidence is kept for the retention
period whether or not the case completes.

## §2 Screening is evidence, not a calculation

A screening result is a record of what was checked, against which list version, on which
date, with which outcome. It is written once by the screening function. Nothing outside
the screening function recomputes it, re-derives it, or infers it from other fields. A
recomputed result has no list version and no date behind it, so it is not evidence.

## §3 Enhanced due diligence

A case that screens to a hit, a PEP match or an unconfirmed beneficial owner goes to
enhanced due diligence and does not proceed on a relationship manager's judgement. The
case may not be approved while EDD is open.

## §4 Four eyes

An onboarding approval requires two distinct approvers. The approver may not be the
person who prepared the file. Both decisions are recorded with the identity of the
approver, the timestamp, and the procedure stage code the case was at when the decision
was taken.

## §5 Beneficial ownership

Beneficial owners are identified to the threshold the procedure sets, and their
identification is evidenced. Where ownership cannot be confirmed from the registry, the
case stays at unconfirmed ownership and the gap is recorded. It is not closed by
assumption.

## §6 Need to know

Beneficial-owner names, director names, dates of birth and identity numbers are personal
data held for a financial-crime purpose. They stay inside the KYC function. They do not
travel to a relationship-manager surface, a client-facing surface, an operational report
or a log, and a derived value that is safe to show does not carry the personal data it
was derived from.

## §7 Stage is named by its procedure code

**Wherever a case's stage is shown, recorded or exchanged, the KYC procedure's stage code
appears verbatim.** The codes are the procedure's, not a system's — `EDD-PENDING` and
`EDD-COMPLETE` are the two seen most often, and the table is in procedure 4.2 §6. They are
what the four-eyes approval record and the audit trail carry.

A screen or a message may add a plain-language description alongside the code. It may not
replace the code with one, translate it, abbreviate it, or show a system's internal enum
name in its place. An auditor reading a screen and an auditor reading the approval record
must be able to see they are looking at the same case at the same stage.

## §8 Auditability

Anything that changes a case's due-diligence state leaves a record that says who or what
changed it, when, and on what basis. An automated step is identified as automated. The
record survives the case.
