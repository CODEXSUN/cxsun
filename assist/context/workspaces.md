# Workspace Map

Use this file to choose the correct workspace before editing or running checks.

| Workspace | Package | Status | Primary Purpose | Common Commands |
|-----------|---------|--------|-----------------|-----------------|
| `apps/server` | `@cxsun/server` | Active | Backend API, domain modules, infrastructure, custom framework core | `npm -w apps/server run typecheck`, `npm -w apps/server run build`, `npm -w apps/server run dev` |
| `apps/platform-api` | `@cxsun/platform-api` | New extraction scaffold | First deployable foundation service extracted from the current combined server; imports existing server modules until migration is complete | `npm run dev:platform-api`, `npm run typecheck:platform-api`, `npm run build:platform-api` |
| `apps/frontend` | `@cxsun/frontend` | Active | React + Vite frontend | `npm -w apps/frontend run typecheck`, `npm -w apps/frontend run build`, `npm -w apps/frontend run dev` |
| `apps/docs` | `@cxsun/docs` | Active documentation | Docusaurus project/client documentation app, independently runnable from the main app | `npm -w apps/docs run start`, `npm -w apps/docs run build` |
| `apps/cli` | `@cxsun/cli` | Active helper | Local scripts for preflight checks and workflow helpers | Run scripts directly with `node apps/cli/<script>.mjs` |
| `apps/cxsync` | `@cxsun/cxsync` | Active maintenance desktop | CXSync Desktop UI/Electron app for local database audit, mirror, dump, and upgrade workflows | `npm run dev:cxsync`, `npm -w apps/cxsync run typecheck`, `npm -w apps/cxsync run compile:electron` |
| `apps/cxsync-cloud` | `@cxsun/cxsync-cloud` | Active maintenance API | Isolated CXSync Cloud API for database audit evidence, mirror, SQL dump, fleet upgrade, and diagnostics | `npm run dev:cxsync-cloud`, `npm -w apps/cxsync-cloud run typecheck`, `npm -w apps/cxsync-cloud run build` |
| `apps/codeit/backend` | `@codeit/backend` | Experimental app | CodeIT backend prototype under `apps/codeit/*` workspace group | `npm -w apps/codeit/backend run dev`, `npm -w apps/codeit/backend run build` |
| `apps/codeit/frontend` | `@codeit/frontend` | Experimental app | CodeIT frontend prototype under `apps/codeit/*` workspace group | `npm -w apps/codeit/frontend run dev`, `npm -w apps/codeit/frontend run build` |
| `packages/shared` | `@cxsun/shared` | Active library | Framework-free shared types, constants, and pure utilities | `npm -w packages/shared run typecheck` |
| `packages/ui` | `@cxsun/ui` | Active UI library | Shared UI primitives, rich components, dashboard shell pieces, and design-system helpers | `npm -w packages/ui run typecheck` |
| `packages/web` | `@cxsun/web` | Reserved | Future reusable web package or app shell if intentionally activated | `npm -w packages/web run typecheck` |
| `packages/desktop` | `@cxsun/desktop` | Active | Electron desktop app with locally packaged frontend assets and `codexsun.local:6005` API default | `npm run dev:desktop`, `npm run build:desktop`, `npm run e2e:desktop`, `npm -w packages/desktop run typecheck` |
| `packages/mobile` | `@cxsun/mobile` | Reserved | Future Expo mobile app | `npm -w packages/mobile run typecheck` |
| `packages/app-shell` | `@cxsun/app-shell` | Active app shell | Shared scaffold/runtime for owned-product and industry app surfaces | `npm -w packages/app-shell run typecheck` |

## Editing Rules

- Default combined-backend work goes in `apps/server` until Core/Billing service extraction begins.
- Default frontend work goes in `apps/frontend`.
- Keep owned products and industry products in this monorepo. Add separate app workspaces only when a product needs its own public UX, dev port, or production domain; keep shared transactions behind service-owned APIs/contracts.
- Target backend cleanup is one repo with multiple backend services. Until those workspaces exist, keep Core, Billing, Ecommerce, CRM, Sites, and CXSync code in clear boundaries inside the current server.
- Shared logic goes in `packages/shared` only when it is framework-free and useful to more than one workspace.
- Shared UI goes in `packages/ui` when it is reusable across apps.
- Do not move active UI work to `packages/web` unless the package is intentionally activated.
- Keep reserved packages typecheckable even while minimal.

## Future App Workspace Rule

Future app workspaces may be added for product-specific public surfaces such as ecommerce, B2B Connect, sports, learning, welfare, branded storefronts, and auditor portal. These apps should remain in the same repo and call Core or the owning app service for billing, accounting, compliance, mail, CRM, files, sites/blog, tenant/company, and ZETRO behavior.

Current scaffolded product app workspaces:

| Workspace | Route hint | Dev port | Command |
|-----------|------------|----------|---------|
| `apps/auditor` | `/app/auditor` | `6030` | `npm run dev:auditor` |
| `apps/ecommerce` | `/app/ecommerce` | `6031` | `npm run dev:ecommerce` |
| `apps/b2b-connect` | `/app/b2b-connect` | `6032` | `npm run dev:b2b-connect` |
| `apps/b2b-connect-admin` | marketplace staff back office | dedicated app port | `npm run dev:b2b-connect-admin` |
| `apps/sports` | `/app/sports` | `6033` | `npm run dev:sports` |
| `apps/learning` | `/app/learning` | `6034` | `npm run dev:learning` |
| `apps/welfare` | `/app/welfare` | `6035` | `npm run dev:welfare` |
| `apps/crm` | `/app/crm` | `6036` | `npm run dev:crm` |
| `apps/sites` | `/app/sites` | `6037` | `npm run dev:sites` |
| `apps/blog` | `/app/blog` | `6038` | `npm run dev:blog` |
| `apps/zetro` | `/app/zetro` | `6039` | `npm run dev:zetro` |
| `apps/textile-lab` | `/app/textile-lab` | `6040` | `npm run dev:textile-lab` |
| `apps/garment` | `/app/garment` | `6041` | `npm run dev:garment` |
| `apps/upvc` | `/app/upvc` | `6042` | `npm run dev:upvc` |

Use `npm run dev:product-apps` only when you intentionally want all scaffolded product apps running together.
