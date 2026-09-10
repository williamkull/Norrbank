import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // In the deployed environments the SSO gateway fronts both the workspace and
      // onboarding-core on the same origin. Locally the proxy stands in for it.
      "/v1": { target: "http://localhost:8080", changeOrigin: true },
      "/v2": { target: "http://localhost:8080", changeOrigin: true },
    },
  },
  test: {
    environment: "happy-dom",
    globals: true,
    // e2e/ is Playwright's, run by `bun run test:e2e`. Vitest would otherwise pick the
    // spec up by its name and fail on an import it has no browser for.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
});
