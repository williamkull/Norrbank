---
name: secure-api-review
description: Apply the Norrbank API security standard. Use whenever creating or modifying an external-facing endpoint, reviewing API code, or generating an OpenAPI spec.
version: "1.4"
---

# Secure API review

Owner: Information security, application security team. Source of truth: API Security
Standard SEC-14. This skill is that standard, written for the sessions that build against
it. Where the two disagree, SEC-14 wins and this file is wrong.

Apply every section below when you create or change an API endpoint.

## §1 Authentication

Every endpoint requires the gateway JWT. There are no anonymous routes outside
`/health` and `/info`. A service that calls another service presents its own client
credential; it does not forward a relationship manager's token.

## §2 Input validation

Validate request bodies against the OpenAPI schema and reject unknown fields. Reject,
do not ignore: an unknown field is either a client on the wrong version or a probe, and
both are worth a 400. Path and query parameters are bound to a type, never to a string
that is later parsed.

## §3 Audit

Every state-changing endpoint emits an audit event carrying actor, action, entity and
timestamp. The actor is the resolved principal, not the caller-supplied identifier. An
endpoint that changes a case and does not emit an audit event is incomplete.

## §4 Data classification

**Fields classified personal data must never appear in log or error output.** That
covers beneficial-owner names, director names, dates of birth, national identity
numbers and residential addresses, whether they arrive from an internal store or an
external provider.

This is the section that gets breached by accident rather than by intent. The usual
route is a whole object reaching a log or an exception message: a record's generated
`toString()`, a serialised DTO in a 500 body, a parse failure that echoes the row it
could not read. Log the identifier — the case number, the row id, the correlation id —
and let a reader with a need to know look the rest up in the system that holds it.

An error returned to a caller says what failed and what to do about it. It does not
carry the data that failed.

## §5 Authorisation

Authentication is not authorisation. An endpoint that takes an identifier resolves the
principal and checks that the principal may see that entity, on every call, including
the read paths. Resolving a principal and discarding the result is the same as not
checking.

## §6 Rate limits and quotas

An endpoint is added behind a gateway route with a rate limit sized against the
service's connection pool. If a change makes a client call an endpoint more often, the
limit is part of the change and the platform team owns it.

## Before you report the work done

Every endpoint has an integration test in `src/itest` that covers the unauthenticated
call, the authorised call and the wrong-principal call. Run `make test` and include the
output in your summary.
