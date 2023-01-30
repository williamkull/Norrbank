# Norrbank corporate onboarding estate

Four systems in one repository. They are deployed separately and owned by different teams,
but they share a case and they change together often enough that splitting the repo has
been proposed twice and dropped twice.

| Directory | What it is | Owner |
|---|---|---|
| `onboarding-core/` | Java 21 / Spring Boot 3 REST service over the corporate onboarding case. | Onboarding platform |
| `screening-batch/` | Nightly sanctions and PEP screening. Runs at 02:00 from cron. | Onboarding operations |
| `registry-link/` | CSV-over-SFTP exchange with the external company registry and UBO provider. | Onboarding operations |
| `rm-workspace/` | React front end for relationship managers, behind the bank's SSO. | Workspace team |
| `deploy/` | Gateway routes and environment config. Platform team owns changes here. | Platform |

## Commands

Run these from the repository root.

- Build: `make build` (must finish with "Build succeeded")
- Test: `make test` (all green; never skip or delete a failing test)
- Lint: `make lint` (zero warnings)

Run all three before reporting any task complete, and paste the output.
If a test fails, fix the code, not the test.

Java builds need a JDK 21 on `JAVA_HOME` or `java` on `PATH`. Maven comes from `./mvnw`.
The front end uses bun.

## Conventions

- Timestamps are ISO-8601 UTC everywhere. Nothing takes the platform default zone.
- Money and dates never cross a module boundary as a formatted string.
- Personal data — beneficial owner names, director names, dates of birth — stays inside
  the KYC function and does not go on a relationship-manager or client surface.
- Ticket IDs go in the commit subject. Jira for work, ServiceNow for change.

## Working here

The four systems disagree about a case more often than you would expect. Read across all
of them before concluding what a case's state is; the answer is rarely in one place.
