# onboarding-core

REST service over the corporate onboarding case: the case itself, its documents, its
approvals and its KYC file. Migrated from Java 8 to Java 21 in 2019; the REST surface has
been migrating from `v1/` to `v2/` since 2024.

## Commands

- Build: `make build` (must finish with "Build succeeded")
- Test: `make test` (all green; never skip or delete a failing test)
- Lint: `make lint` (zero warnings)

Run all three before reporting any task complete, and paste the output.
If a test fails, fix the code, not the test.

## Conventions

- Java 21, Spring Boot 3. Timestamps are ISO-8601 UTC, never local time — take the
  injected `Clock`, never `Instant.now()` directly.
- Every endpoint needs an integration test in `src/itest`.
- Screening results are read-only outside `core/screening`; never recompute them in a
  controller.
- Constructor injection. No field injection, no `@Autowired` on fields.

## Architecture

- `v1/` and `v2/` are the versioned REST surfaces.
- `api/` is shared web plumbing: error handling, the SSO principal.
- `core/` is the domain, one package per aggregate.
- `adapters/` is everything that talks to something outside this service.
- Kafka events are defined in `src/main/resources/schemas/`; never edit generated classes.
- Database migrations live in `src/main/resources/db/migration/` and are applied by the
  platform team's pipeline, not by the application.

## Things Claude gets wrong

- Do not bump dependency versions; the platform team owns them.
- The legacy `v1/` package is frozen; changes go in `v2/`.
- Do not add a column to an existing table without a migration in the same commit.
- Never put beneficial-owner or director names in log or error output.
