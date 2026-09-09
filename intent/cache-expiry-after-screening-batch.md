# Intent: cache expiry after the screening batch
Author: claude-code[bot] (2σ diagnosis, band post_deploy_error_rate). Status: draft. Jira: —
## Anomaly
Post-deploy error rate on the RM workspace crossed the 2σ band at 07:14 on 2026-09-12,
with prod-2026.09.11-onb-2140 in the window. 0.4% to 11.6% over eleven minutes, then
falling back on its own by 07:31.
## Evidence
screening-batch run 20260912 rewrote every open case stage between 02:00 and 02:04.
The status cache entries written on 2026-09-11 all expired at 02:05, together, because
they were written together at deploy time and carry one TTL.
No workspace traffic between 02:05 and 06:58. Nothing surfaced.
07:00 to 07:14 the login ramp: 214 sessions, every case view a cache miss.
The gateway rate-limits onboarding-core at 50 rps. 429s from 07:11, surfacing in the
panel as errors rather than as a stale reading.
## Proposed outcome
Stagger cache expiry so entries do not fall due together, and place the expiry after the
batch rather than across it. Pre-warm the cache for open cases before the morning ramp,
so the first RM of the day does not pay for the whole estate's misses.
## Affected users and systems
RM workspace, onboarding-core, the gateway rate limit budget, screening-batch's schedule.
## Open questions
Should a panel that cannot reach the endpoint show the last known stage with its age,
rather than an error? That is a product decision, not a cache one.
