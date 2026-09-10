# Review instructions

Every pull request against this estate gets these passes, in this order. The passes are the
same for a one-line change and a two-module one; what varies is how much each pass finds.

## Passes

Run three passes and tag each finding with its pass:

- **Bugs** — logic errors, broken edge cases, subtle regressions. Off-by-one, null and
  empty, the second call, the case that was already in that state, the path that only runs
  at night.
- **Security** — injection risks, authentication gaps, missing authorisation on a read
  path, secrets in the diff, and personal data reaching a log or an error message.
- **Compliance** — the change matches `spec.md` and `plan.md`, and it honours the skills
  those cite. Read both files. A change that does something better than the plan said still
  gets a finding, because the plan is what was accepted.

## What Important means here

Reserve **Important** for findings that would break behaviour, leak data or breach a
policy. Everything else is a **Nit**. Style, naming and preference are nits.

Rank findings by severity, Important first, and give each one a file and a line. A finding
that does not say where it is cannot be acted on.

## Cap the nits

Report at most two nits per review. Summarise the rest as a count on its own line:

```
+ N further nits not listed.
```

## Feed findings back into CLAUDE.md

**When a review flags the same mistake for the second time, the correction goes into
`CLAUDE.md` as part of that review** — in the same pull request, as a line under "Things
Claude gets wrong". Review reads `CLAUDE.md`, so from the next pull request onward the
mistake is caught before it is written.

Also flag when a change has made `CLAUDE.md` outdated.

## Do not report

- Generated classes under `src/main/generated/` and anything built from
  `src/main/resources/schemas/`.
- Formatting. The formatter hook owns it.
- Anything `make build`, `make test` or `make lint` already enforces. If CI catches it, the
  review does not need to.

## What review does not do

Findings do not approve or block a pull request on their own. Branch protection requires an
approval from a code owner, and the code owner decides on intent and risk with the findings
in hand.

The agent that wrote the change does not approve it.
