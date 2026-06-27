# Application Architecture

## Overview

`cxsun` is a focused multi-tenant billing platform built as a TypeScript monorepo. The current working runtime is:

- Backend: `apps/server` (`@cxsun/server`), Node.js + Fastify with a custom decorator/bootstrap layer.
- Frontend: `apps/frontend` (`@cxsun/frontend`), React + Vite.
- Shared package: `packages/shared` (`@cxsun/shared`), for framework-free shared types, constants, and pure utilities.
- Shared UI package: `packages/ui` (`@cxsun/ui`), for reusable UI primitives, rich components, dashboard shell pieces, and design-system helpers.
- Workflow helpers: `apps/cli` (`@cxsun/cli`).

<<<<<<< Updated upstream
Reserved platform packages exist under `packages/` for future channels:

- `packages/web` (`@cxsun/web`) is a placeholder and is not the active Vite frontend.
- `packages/desktop` (`@cxsun/desktop`) is the active Electron desktop application.
- `packages/mobile` (`@cxsun/mobile`) is a placeholder Expo package.

=======
>>>>>>> Stashed changes
## Monorepo Structure

```text
cxsun/
├── apps/
│   ├── cli/
│   ├── frontend/
│   └── server/
├── packages/
│   └── shared/
└── assist/
```

## Key Principles

<<<<<<< Updated upstream
- Current combined app development targets `apps/server` and `apps/frontend` unless the user explicitly asks for another workspace.
- `apps/server` is a temporary combined backend. Keep it stable while preparing Platform API first and Billing API second for service extraction.
- The owning backend service owns business logic and exposes APIs consumed by clients.
- Client apps must not duplicate service-owned domain logic.
- Keep the platform as one repo. The current active backend is `apps/server`, but the target cleanup direction is multiple independently deployable backend services inside the same repo: Core, Billing, Ecommerce, CRM, Sites, and CXSync. Different owned products and industry products may run as separate app surfaces on separate dev ports/domains, and they must share behavior through Core/services/contracts instead of direct table writes.
- `@cxsun/shared` must stay framework-free: types, constants, and pure utilities only.
- Keep apps deployable independently. Share through `@cxsun/shared`, APIs, and documented contracts.
- Multi-tenant behavior belongs in backend infrastructure and domain/application services. In the future split, Platform API owns shared tenant resolution and app services use documented Platform API contracts.
- Tenant-owned APIs must resolve through `TenantContextService` before touching tenant-local data.
- Platform/master APIs use the master MariaDB database directly and must not accidentally read tenant-local tables.

## Backend Structure

The backend lives in `apps/server/src`.

```
apps/server/src/
├── main.ts
├── core/
│   ├── decorators/
│   ├── exceptions/
│   ├── guards/
│   ├── health/
│   ├── industry/
│   ├── interfaces/
│   ├── system/
│   ├── tenant/
│   ├── tenant-domain/
│   ├── bootstrap.ts
│   └── container.ts
├── shared/
│   ├── filters/
│   ├── guards/
│   └── middleware/
├── infrastructure/
│   ├── database/
│   ├── queue/
│   ├── tenant-database/
│   └── shutdown.ts
└── modules/
    ├── auth/
    ├── common/<group>/<module>/
    ├── entries/sales/
    ├── foundation/master-data/
    ├── foundation/master-record/
    ├── home/
    ├── master/company/
    ├── master/contact/
    ├── master/order/
    ├── master/product/
    └── site/
```

For new or expanded business modules, prefer:

- `domain/` for entities, value objects, and domain events.
- `application/` for use cases, DTOs, and application services.
- `infrastructure/` for repositories, database code, external adapters, migrations, and seeders.
- `interface/` for HTTP controllers, WebSocket handlers, and request/response adapters.
- `index.ts` for the module public API.

Avoid direct cross-module imports. Use explicit public module exports, application contracts, or events where module boundaries are involved.
=======
- Active development targets `apps/server` and `apps/frontend`.
- The server owns business logic and exposes APIs consumed by the frontend.
- The frontend must not duplicate server-owned domain logic.
- `@cxsun/shared` must stay framework-free: types, constants, and pure utilities only.
- Keep tenant business data isolated in tenant databases.
- Keep platform orchestration data in the master MariaDB database.
- Add new workspaces only when they are truly runnable, documented, and included in verification.
>>>>>>> Stashed changes

## Backend Placement Rules

- Put framework runtime, decorators, DI, guards, and platform/core modules under `apps/server/src/core`.
- Put backend-only shared helpers under `apps/server/src/shared`.
- Put database, queue, tenant provisioning, and lifecycle adapters under `apps/server/src/infrastructure`.
- Put reusable engines and compatibility registries under `apps/server/src/modules/foundation`.
<<<<<<< Updated upstream
- Put stable cross-product business engines/services under clear service-owned module boundaries when they emerge. Platform API owns common platform behavior. Billing, accounting, compliance, mail, files, CRM, sites/blog, tenant/company, subscription, and ZETRO capabilities should be reused by app modules through contracts instead of copied into ecommerce, auditor, sports, learning, welfare, B2B Connect, or industry modules.
- For new service-split work, follow `assist/rules/service-boundaries.md`: Platform API owns common platform needs, app services own only their business schema, and cross-app work goes through APIs/events.
- Put every common business module under `apps/server/src/modules/common/<group>/<module>`.
=======
>>>>>>> Stashed changes
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
├── app/
├── assets/
├── components/
├── features/
├── App.tsx
└── main.tsx
```

<<<<<<< Updated upstream
Keep UI feature code in `apps/frontend` until a separate reusable package is intentionally introduced.

## Frontend Module Page Routing

- Every concrete user-facing module page must be routed to its own feature-owned page component under `apps/frontend/src/features/<module>/`.
- Route module pages explicitly from the dashboard/router to that feature page. Do not hide module ownership behind a generic page switch.
- Shared pages and registries, such as master-data or common-data screens, may provide reusable primitives and generic fallback behavior only.
- Do not grow generic pages with module-specific `if/else` branches for columns, filters, lookups, form layout, tabs, print behavior, or detail views.
- When a module needs custom behavior, create or extend that module's standalone page instead. Keep product code in product, contact code in contact, company code in company, sales code in sales, and so on.

## Cross-App Communication

```text
frontend / product clients
          |
          | HTTP/WS
          v
current: apps/server transition backend
target: platform-api + app-owned APIs
          |
          v
tenant database table groups / infrastructure
```

`@cxsun/shared` supplies shared types, constants, and pure utilities only. `@cxsun/ui` supplies shared UI primitives and rich components.

Cross-app transaction rule:

- App modules and public app surfaces must not write another app's transaction tables directly.
- Ecommerce, B2B Connect, auditor, sports, learning, welfare, brand storefront, and industry apps must call the owning service/engine for billing, accounting, compliance, inventory, mail, files, and reporting.
- Correct shape: `app use case -> shared service/engine -> tenant module tables/postings`.
- Wrong shape: `app use case -> direct insert into another app's ledger/invoice/posting tables`.

Target service-split rule:

- Platform API owns shared foundation: auth, tenant, users, companies, accounting years, RBAC, mail, notifications, files, audit, and app enablement.
- Billing API owns only billing workflows and `billing_*` tenant tables.
- Ecommerce API owns only ecommerce workflows and `ecommerce_*` tenant tables.
- CRM API owns only CRM workflows and `crm_*` tenant tables.
- Sites API owns only site/content workflows and `sites_*` tenant tables.
- CXSync API owns database maintenance, clone, mirror, and migration safety only.
- Every tenant gets `core_*` tables by default. Optional app tables are created or activated according to tenant app enablement.

## TConnect and Tirupur Connect Boundary

- `tconnect` is the billing/ERP connector only. It owns tenant-side publication selection, immutable submissions/revisions, signed synchronization state, and optional opportunity import into billing documents.
- `tirupur-connect` is the central marketplace engine. It owns public listings, normalized marketplace records, web-only onboarding, buyers, RFQs, quotations, memberships, payments, verification, moderation, content, and marketplace analytics.
- The marketplace must operate without a billing tenant and must not use a special billing tenant as its database owner.
- Tirupur Connect owns the dedicated `tirupur_connect_db` database. Do not register Tirupur Connect tables in platform/master migrations or tenant provisioning.
- Keep backend modules separate at `apps/server/src/modules/tconnect` and `apps/server/src/modules/tirupur-connect`.
- Keep route families separate: `/api/v1/tconnect/*` for connector operations and `/api/v1/tirupur-connect/{public,member,admin,sync}/*` for marketplace operations.
- `apps/b2b-connect` is the Tirupur Connect public/member product. Marketplace staff use a dedicated `apps/b2b-connect-admin` application.
- Connected billing records and web-only marketplace records normalize into one marketplace model with explicit source provenance.
- Connector synchronization never silently overwrites an approved public record. A source change creates a new reviewable revision.
- Tirupur Connect may retain an opportunity/conversion reference, but imported quotations, sales orders, invoices, and accounting remain owned by the billing tenant.
- Follow `assist/context/tirupur-connect-boundary.md` whenever older TConnect or B2B Connect documents conflict.
=======
- Keep UI feature code in `apps/frontend`.
- Route module pages explicitly from the dashboard/router to feature-owned page components.
- Do not grow generic pages with module-specific branches when a standalone feature page is clearer.
>>>>>>> Stashed changes

## Environment Variables

- `VITE_*` is consumed by `apps/frontend`.
- Server variables are consumed by `apps/server`.

Current default local ports:

- Server: `6005`
<<<<<<< Updated upstream
- Docs: `6020`
- Product app shells: auditor `6030`, ecommerce `6031`, B2B Connect `6032`, sports `6033`, learning `6034`, welfare `6035`, CRM `6036`, sites `6037`, blog `6038`, ZETRO `6039`, textile lab `6040`, garment `6041`, UPVC `6042`.
- Future public/product apps may run on separate local ports to avoid route/feature confusion while staying in one repo. See `assist/context/one-repo-multi-backend.md` for the owned-domain/app/service direction.

GST and domain deployment rules:

- Keep global GSP client credentials in database-backed Super Admin GST provider settings, split by sandbox/production and credential purpose. Do not restore obsolete WhiteBooks client-id/client-secret environment variables.
- Tenant GST settings own tenant-specific GST username, password, GSTIN, and sandbox/production selection.
- `GSP_SANDBOX_BASE_URL` may remain an environment-level provider endpoint default; secrets must not be committed.
- Cloud/Docker reinstall must not create tenant domains automatically unless `AUTO_SEED_TENANT_DOMAINS=true` is explicitly set.
=======
- Frontend: `6010`
>>>>>>> Stashed changes
