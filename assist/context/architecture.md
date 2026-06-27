# Architecture Context

This file records the current project shape and decisions that should guide future AI-assisted work.

## Active Workspaces

- `apps/server` (`@cxsun/server`): active backend API using Fastify and the custom `core/` decorator/bootstrap layer.
- `apps/frontend` (`@cxsun/frontend`): active React + Vite frontend using Tailwind CSS and shadcn-style UI primitives.
- `apps/cli` (`@cxsun/cli`): local helper scripts such as preflight port checks, database backup helpers, build helpers, and GitHub helpers.
- `packages/shared` (`@cxsun/shared`): shared framework-free types, constants, and pure utilities.

## Decision Records

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-14 | Use `apps/server` as the only active backend workspace. | The runnable API lives under `apps/server`. |
| 2026-05-14 | Use `apps/frontend` as the active React + Vite frontend. | The billing UI is under `apps/frontend`. |
| 2026-05-14 | Keep `packages/shared` framework-free. | Shared code should stay portable between server and frontend. |
| 2026-05-24 | Use MariaDB for both master/platform persistence and tenant-isolated databases. | One deployable database engine keeps platform and tenant persistence consistent. |
| 2026-05-15 | Split dashboards into super-admin, admin, and tenant modes. | Platform orchestration, software support, and tenant business work have different responsibilities. |
| 2026-05-16 | Keep framework/platform modules in `core`, reusable record engines in `modules/foundation`, and business modules in bounded module groups. | Clear backend boundaries make modules easier to reuse, drop, or enhance. |
| 2026-05-16 | Use `id INT AUTO_INCREMENT PRIMARY KEY` plus `uuid CHAR(8) NOT NULL UNIQUE` on application tables. | Numeric IDs stay fast internally while short public UUIDs hide sequences in APIs and UI. |
| 2026-06-26 | Remove unused product-app, docs, desktop, mobile, web, UI, app-shell, and CXSync workspaces from the active repo. | The computer should run the billing app without stale workspace commands or missing app folders. |

## Current Verification Pattern

Run targeted checks during development, or `npm run check` before finalizing meaningful changes.

```bash
npm -w apps/server run typecheck
npm -w apps/frontend run typecheck
npm -w packages/shared run typecheck
npm run build:active
```

## Backend Placement

- Put server business modules under `apps/server/src/modules`.
- Put framework runtime, decorators, DI, guards, and platform/core modules under `apps/server/src/core`.
- Put backend cross-cutting helpers under `apps/server/src/shared`.
- Put infrastructure configuration and lifecycle code under `apps/server/src/infrastructure`.
- Put reusable generic engines under `apps/server/src/modules/foundation`.
- Put standalone master modules under `apps/server/src/modules/master`.
- Put common business modules under `apps/server/src/modules/common/<group>/<module>`.
- Put tenant entries under `apps/server/src/modules/entries`.
- Put settings and document numbering under `apps/server/src/modules/settings`.
- Use `TenantContextService` for tenant-owned APIs.

## Frontend Placement

- Put active UI work under `apps/frontend/src`.
- Route concrete module pages to standalone feature-owned pages under `apps/frontend/src/features/<module>`.
- Keep frontend CSS under `apps/frontend/src/assets/css`.
- Keep route families separate:
  - `/app/*` for tenant/client users with `/login`.
  - `/admin/*` for admin/helpdesk users with `/admin/login`.
  - `/sa/*` for super admins with `/sg/login` and `/sa/login` alias.

## Tenant Flow

Current request flow for tenant-owned data:

```text
URL host/domain
  -> tenant_domains
  -> tenants
  -> auth JWT and user_tenants
  -> TenantContextService
  -> tenant MariaDB database
```

Platform/master data lives in the MariaDB database configured by `DB_*` environment variables. Tenant-local data lives in MariaDB databases described by each tenant row.
