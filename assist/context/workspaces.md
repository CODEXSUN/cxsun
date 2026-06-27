# Workspace Map

Use this file to choose the correct workspace before editing or running checks.

| Workspace | Package | Status | Primary Purpose | Common Commands |
|-----------|---------|--------|-----------------|-----------------|
| `apps/server` | `@cxsun/server` | Active | Backend API, domain modules, infrastructure, custom framework core | `npm -w apps/server run typecheck`, `npm -w apps/server run build`, `npm -w apps/server run dev` |
| `apps/frontend` | `@cxsun/frontend` | Active | React + Vite billing frontend | `npm -w apps/frontend run typecheck`, `npm -w apps/frontend run build`, `npm -w apps/frontend run dev` |
| `apps/cli` | `@cxsun/cli` | Active helper | Local scripts for preflight checks and workflow helpers | Run scripts directly with `node apps/cli/<script>.mjs` |
| `apps/cxsync` | `@cxsun/cxsync` | Active maintenance desktop | CXSync Desktop UI/Electron app for local database audit, mirror, dump, and upgrade workflows | `npm run dev:cxsync`, `npm -w apps/cxsync run typecheck`, `npm -w apps/cxsync run compile:electron` |
| `apps/cxsync-cloud` | `@cxsun/cxsync-cloud` | Active maintenance API | Isolated CXSync Cloud API for database audit evidence, mirror, SQL dump, fleet upgrade, and diagnostics | `npm run dev:cxsync-cloud`, `npm -w apps/cxsync-cloud run typecheck`, `npm -w apps/cxsync-cloud run build` |
| `apps/codeit/backend` | `@codeit/backend` | Experimental app | CodeIT backend prototype under `apps/codeit/*` workspace group | `npm -w apps/codeit/backend run dev`, `npm -w apps/codeit/backend run build` |
| `apps/codeit/frontend` | `@codeit/frontend` | Experimental app | CodeIT frontend prototype under `apps/codeit/*` workspace group | `npm -w apps/codeit/frontend run dev`, `npm -w apps/codeit/frontend run build` |
| `packages/shared` | `@cxsun/shared` | Active library | Framework-free shared types, constants, and pure utilities | `npm -w packages/shared run typecheck` |

## Editing Rules

- Default combined-backend work goes in `apps/server` until Core/Billing service extraction begins.
- Default frontend work goes in `apps/frontend`.
- Shared logic goes in `packages/shared` only when it is framework-free and useful to both server and frontend.
- Local workflow scripts go in `apps/cli`.
- Do not add a new workspace unless the product needs a clearly separate runtime.

## Verification

Run focused checks while working:

```bash
npm -w apps/server run typecheck
npm -w apps/frontend run typecheck
npm -w packages/shared run typecheck
```

Run the full active check before finalizing meaningful work:

```bash
npm run check
```
