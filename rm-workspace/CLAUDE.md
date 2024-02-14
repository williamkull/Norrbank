# rm-workspace

React front end for relationship managers. Behind the bank's SSO; the gateway
authenticates and injects the session.

## Commands

- `bun run dev` — dev server on 5173, proxying `/v1` and `/v2` to onboarding-core on 8080
- `bun run test` — vitest
- `bun run lint` — `tsc --noEmit`, and it must be clean

## Conventions

- TypeScript strict. No `any`.
- The workspace holds nothing in its session beyond what the gateway forwards, and adds
  nothing to it.
- Presentation formatting lives in `shared/formatting.ts`. Components do not format dates
  or organisation numbers inline.
