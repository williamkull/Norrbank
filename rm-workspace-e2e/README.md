# RM workspace end-to-end suite

The browser tests for the relationship manager workspace's case list. They were written in
2019 for the Jenkins slave and moved into the repository with PLAT-770, unchanged in shape.

```
./mvnw -B -f rm-workspace-e2e/pom.xml -Pe2e test
```

It is not a module of the root `pom.xml` and it has no parent. That is the point: `make
build`, `make test` and `make lint` are what a developer runs, and none of them should
download a browser. Without `-Pe2e` the tests are skipped, so running Maven in this
directory by accident starts nothing.

What it needs before it runs:

- **A built bundle.** The suite serves `../rm-workspace/dist`, not the Vite dev server,
  because that is what staging serves. Run `cd rm-workspace && bun run build` first.
- **Chrome.** Selenium Manager resolves a matching driver against whatever Chrome is on the
  machine. Set `NORRBANK_E2E_HEADLESS=1` to run without a window; the pipeline does.

What it does not need: onboarding-core. `WorkspaceStubServer` answers `/v2/cases` with the
same cases `db/local-data.sql` seeds for `s.lundin`, so the suite tests the workspace and
fails for workspace reasons only. When the API is what you want to test, that is
`CaseQueryControllerIT` in onboarding-core.
