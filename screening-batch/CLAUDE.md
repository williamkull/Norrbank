# screening-batch

The nightly sanctions and PEP screening run. Older than the API and it goes at the
onboarding database directly.

## What it does

For every open case: screen each party against every list, post the party results into
`screening_result`, derive one case stage, and rewrite the stage file in full.

## Things to know

- It runs at 02:00 from cron (`ops/screening-batch.cron`) and holds a lock on the stage
  file for the whole run. Nothing may read the file while the lock is there.
- The stage file is rewritten completely on every run. There is no incremental path and no
  per-case update.
- The case stage this job derives is written to the stage file and nowhere else.
