# Application Architecture

## Overview

`cxsun` is a focused multi-tenant billing platform built as a TypeScript monorepo. The current working runtime is:

- Backend: `apps/server` (`@cxsun/server`), Node.js + Fastify with a custom decorator/bootstrap layer.
- Frontend: `apps/frontend` (`@cxsun/frontend`), React + Vite.
- Shared package: `packages/shared` (`@cxsun/shared`), for framework-free shared types, constants, and pure utilities.
- Workflow helpers: `apps/cli` (`@cxsun/cli`).

## Monorepo Structure

```text
cxsun/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ cli/
â”‚   â”œâ”€â”€ frontend/
â”‚   â””â”€â”€ server/
â”œâ”€â”€ packages/
â”‚   â””â”€â”€ shared/
â””â”€â”€ assist/
```

## Key Principles

- Active development targets `apps/server` and `apps/frontend`.
- The server owns business logic and exposes APIs consumed by the frontend.
- The frontend must not duplicate server-owned domain logic.
- `@cxsun/shared` must stay framework-free: types, constants, and pure utilities only.
- Keep tenant business data isolated in tenant databases.
- Keep platform orchestration data in the master MariaDB database.
- Add new workspaces only when they are truly runnable, documented, and included in verification.

## Backend Placement Rules

- Put framework runtime, decorators, DI, guards, and platform/core modules under `apps/server/src/core`.
- Put backend-only shared helpers under `apps/server/src/shared`.
- Put database, queue, tenant provisioning, and lifecycle adapters under `apps/server/src/infrastructure`.
- Put reusable engines and compatibility registries under `apps/server/src/modules/foundation`.
- Put standalone master modules under `apps/server/src/modules/master/<module>`.
- Put tenant transaction/entry modules under `apps/server/src/modules/entries/<module>`.
- Put every common business module under `apps/server/src/modules/common/<group>/<module>`.
- Keep internal folder moves API-stable unless the user explicitly requests a route change.

## Database Identity

New application-owned tables must use:

```sql
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE
```

- Use `id` for internal joins and foreign keys.
- Use `uuid` for API payloads, frontend routing, and public references.
- Generate public UUIDs through the shared public UUID helper.

## Tenant Runtime

Tenant-owned requests follow this path:

```text
request URL host/domain
  -> platform tenant_domains table
  -> platform tenants table
  -> auth JWT + platform user_tenants access check
  -> per-tenant MariaDB connection
  -> tenant-local tables
```

Tenant-owned APIs must resolve through `TenantContextService` before touching tenant-local data.

## Dashboard Boundaries

Frontend dashboard routing must remain split by role:

- `super-admin`: platform orchestration and safe tenant diagnostics.
- `admin`: software support, bugs, helpdesk, and update work.
- Tenant users: isolated client workspaces with enabled application desks and selected company/accounting-year context.

Route families:

- `/app/*` for tenant/client users with `/login`.
- `/admin/*` for admin/helpdesk users with `/admin/login`.
- `/sa/*` for super admins with `/sg/login` and `/sa/login` as an alias.

Each surface must keep its own auth storage key and auth gate.

## Frontend Structure

The active frontend lives in `apps/frontend/src`.

```text
apps/frontend/src/
â”œâ”€â”€ app/
â”œâ”€â”€ assets/
â”œâ”€â”€ components/
â”œâ”€â”€ features/
â”œâ”€â”€ App.tsx
â””â”€â”€ main.tsx
```

- Keep UI feature code in `apps/frontend`.
- Route module pages explicitly from the dashboard/router to feature-owned page components.
- Do not grow generic pages with module-specific branches when a standalone feature page is clearer.

## Environment Variables

- `VITE_*` is consumed by `apps/frontend`.
- Server variables are consumed by `apps/server`.

Current default local ports:

- Server: `6005`
- Frontend: `6010`
