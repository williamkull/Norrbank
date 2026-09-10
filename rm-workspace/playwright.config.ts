import { defineConfig, devices } from "@playwright/test";

/**
 * Browser cover for the workspace. Separate from `bun run test`, which is vitest over
 * `src/`: `make test` runs the unit suite and CI runs both, so a developer without a
 * browser installed is not blocked by one.
 */
/** The dev server's port. Overridable so two checkouts can run this at once. */
const port = Number(process.env.WORKSPACE_PORT ?? 5173);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "list" : "line",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `bun run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
