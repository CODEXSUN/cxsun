# Workspace Map

Use this file to choose the correct workspace before editing or running checks.

| Workspace | Package | Status | Primary Purpose | Common Commands |
|-----------|---------|--------|-----------------|-----------------|
| `apps/server` | `@cxsun/server` | Active | Backend API, domain modules, infrastructure, custom framework core | `npm -w apps/server run typecheck`, `npm -w apps/server run build`, `npm -w apps/server run dev` |
| `apps/frontend` | `@cxsun/frontend` | Active | React + Vite frontend | `npm -w apps/frontend run typecheck`, `npm -w apps/frontend run build`, `npm -w apps/frontend run dev` |
| `apps/docs` | `@cxsun/docs` | Active documentation | Docusaurus project/client documentation app, independently runnable from the main app | `npm -w apps/docs run start`, `npm -w apps/docs run build` |
| `apps/cli` | `@cxsun/cli` | Active helper | Local scripts for preflight checks and workflow helpers | Run scripts directly with `node apps/cli/<script>.mjs` |
| `packages/shared` | `@cxsun/shared` | Active library | Framework-free shared types, constants, and pure utilities | `npm -w packages/shared run typecheck` |
| `packages/web` | `@cxsun/web` | Reserved | Future reusable web package or app shell if intentionally activated | `npm -w packages/web run typecheck` |
| `packages/desktop` | `@cxsun/desktop` | Reserved stub | Future Electron desktop app | `npm -w packages/desktop run typecheck` |
| `packages/mobile` | `@cxsun/mobile` | Reserved | Future Expo mobile app | `npm -w packages/mobile run typecheck` |
| `packages/app-shell` | `@cxsun/app-shell` | Active app shell | Shared scaffold/runtime for owned-product and industry app surfaces | `npm -w packages/app-shell run typecheck` |

## Editing Rules

- Default backend work goes in `apps/server`.
- Default frontend work goes in `apps/frontend`.
- Keep owned products and industry products in this monorepo. Add separate app workspaces only when a product needs its own public UX, dev port, or production domain; keep shared transactions behind server-owned engines/services.
- Shared logic goes in `packages/shared` only when it is framework-free and useful to more than one workspace.
- Do not move active UI work to `packages/web` unless the package is intentionally activated.
- Keep reserved packages typecheckable even while minimal.

## Future App Workspace Rule

Future app workspaces may be added for product-specific public surfaces such as ecommerce, B2B Connect, sports, learning, welfare, branded storefronts, and auditor portal. These apps should remain in the same repo and call the shared server API/core services for billing, accounting, compliance, mail, CRM, files, sites/blog, tenant/company, and ZETRO behavior.

Current scaffolded product app workspaces:

| Workspace | Route hint | Dev port | Command |
|-----------|------------|----------|---------|
| `apps/auditor` | `/app/auditor` | `6030` | `npm run dev:auditor` |
| `apps/ecommerce` | `/app/ecommerce` | `6031` | `npm run dev:ecommerce` |
| `apps/b2b-connect` | `/app/b2b-connect` | `6032` | `npm run dev:b2b-connect` |
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
