# Local run data

What the three systems hold locally, for the same eight cases.

- `screening/case-stage.dat` — what the last nightly run left. `make screening-run` rewrites it.
- `registry/inbound/` — a provider drop waiting to be imported.

The onboarding database is seeded from `onboarding-core/src/main/resources/db/local-data.sql`
on the `local` profile.

Point the two jobs here when running locally:

    -Dstage.file.path=local/screening/case-stage.dat
    -Dsftp.inbound.path=local/registry/inbound
