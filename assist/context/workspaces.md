# Workspace Map

Use this file to choose the correct workspace before editing or running checks.

| Workspace | Package | Status | Primary Purpose | Common Commands |
|-----------|---------|--------|-----------------|-----------------|
| `apps/server` | `@cxsun/server` | Active | Backend API, domain modules, infrastructure, custom framework core | `npm -w apps/server run typecheck`, `npm -w apps/server run build`, `npm -w apps/server run dev` |
| `apps/frontend` | `@cxsun/frontend` | Active | React + Vite frontend | `npm -w apps/frontend run typecheck`, `npm -w apps/frontend run build`, `npm -w apps/frontend run dev` |
| `apps/cli` | `@cxsun/cli` | Active helper | Local scripts for preflight checks and workflow helpers | Run scripts directly with `node apps/cli/<script>.mjs` |
| `packages/shared` | `@cxsun/shared` | Active library | Framework-free shared types, constants, and pure utilities | `npm -w packages/shared run typecheck` |
| `packages/web` | `@cxsun/web` | Reserved | Future reusable web package or app shell if intentionally activated | `npm -w packages/web run typecheck` |
| `packages/desktop` | `@cxsun/desktop` | Reserved stub | Future Electron desktop app | `npm -w packages/desktop run typecheck` |
| `packages/mobile` | `@cxsun/mobile` | Reserved | Future Expo mobile app | `npm -w packages/mobile run typecheck` |

## Editing Rules

- Default backend work goes in `apps/server`.
- Default frontend work goes in `apps/frontend`.
- Shared logic goes in `packages/shared` only when it is framework-free and useful to more than one workspace.
- Do not move active UI work to `packages/web` unless the package is intentionally activated.
- Keep reserved packages typecheckable even while minimal.
