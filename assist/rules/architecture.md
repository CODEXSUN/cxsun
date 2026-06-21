# Application Architecture

## Overview

`cxsun` is an ERP + ecommerce + multi-tenant platform built as a TypeScript monorepo. The current working runtime is:

- Backend: `apps/server` (`@cxsun/server`), Node.js + Fastify with a custom decorator/bootstrap layer.
- Frontend: `apps/frontend` (`@cxsun/frontend`), React + Vite.
- Shared package: `packages/shared` (`@cxsun/shared`), for framework-free shared types, constants, and pure utilities.
- Workflow helpers: `apps/cli` (`@cxsun/cli`).

Reserved platform packages exist under `packages/` for future channels:

- `packages/web` (`@cxsun/web`) is a placeholder and is not the active Vite frontend.
- `packages/desktop` (`@cxsun/desktop`) is a minimal Electron placeholder.
- `packages/mobile` (`@cxsun/mobile`) is a placeholder Expo package.

## Monorepo Structure

```
cxsun/
├── .env                         # Root env vars, never commit secrets
├── .env.sample                  # Template with required vars
├── package.json                 # Workspace root and active scripts
├── tsconfig.base.json           # Shared TS config
├── apps/
│   ├── cli/                     # Local workflow scripts
│   ├── frontend/                # Active React + Vite app
│   │   ├── public/              # Static frontend assets
│   │   └── src/                 # Frontend source
│   └── server/                  # Active backend API
│       └── src/
│           ├── core/            # Framework/runtime and platform/core modules
│           ├── shared/          # Shared backend filters, middleware, helpers
│           ├── infrastructure/  # Database, queue, tenant provisioning, adapters
│           └── modules/         # Business modules and foundation engines
├── packages/
│   ├── shared/                  # Types, constants, pure utilities only
│   ├── web/                     # Placeholder package
│   ├── desktop/                 # Placeholder Electron package
│   └── mobile/                  # Placeholder Expo package
└── assist/                      # AI agent rules, context, and docs
```

## Key Principles

- Active development targets `apps/server` and `apps/frontend` unless the user explicitly asks for a reserved package.
- The server owns business logic and exposes APIs consumed by clients.
- Client apps must not duplicate server-owned domain logic.
- Keep the platform as one repo and one backend server unless a future ownership/security/scale decision explicitly changes it. Different owned products and industry products may run as separate app surfaces on separate dev ports/domains, but they share server-owned engines and services.
- `@cxsun/shared` must stay framework-free: types, constants, and pure utilities only.
- Keep apps deployable independently. Share through `@cxsun/shared`, APIs, and documented contracts.
- Multi-tenant behavior belongs in server-side infrastructure and domain/application services.
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

## Backend Placement Rules

- Put framework runtime, decorators, DI, guards, and platform/core modules under `apps/server/src/core`.
- Put small backend-only shared helpers under `apps/server/src/shared`; do not use `src/common` for this because `modules/common` is a business module boundary.
- Put reusable engines and compatibility registries under `apps/server/src/modules/foundation`.
- Put stable cross-product business engines/services under clear server-owned module boundaries when they emerge. Billing, accounting, compliance, mail, files, CRM, sites/blog, tenant/company, subscription, and ZETRO capabilities should be reused by app modules instead of copied into ecommerce, auditor, sports, learning, welfare, B2B Connect, or industry modules.
- Put every common business module under `apps/server/src/modules/common/<group>/<module>`.
- Put standalone master modules under `apps/server/src/modules/master/<module>`.
- Put tenant transaction/entry modules under `apps/server/src/modules/entries/<module>`.
- Put auditor-office modules under `apps/server/src/modules/auditor/<module>`; current contact-based modules include contact credentials and GST Filing.
- Keep internal folder moves API-stable unless the user explicitly requests a route change.

## Tenant Feature Visibility

- Company software settings are persisted tenant-side and apply to the selected default company.
- A feature switch must control every discoverable frontend surface for that feature: sidebar navigation, overview cards/tables, shortcuts, route access, and related settings.
- Hidden frontend features must also reject or redirect direct route access. Do not rely only on removing a menu item.
- Disabling a feature is a visibility/capability decision, not a data deletion operation. Preserve existing records unless deletion is explicitly requested.
- Keep feature-specific data modules separate even when their screens begin from a copied workflow. Domestic Sales and Export Sales must not share entry tables or numbering sequences.

## Database Identity Rules

All application-owned tables must keep a compact internal primary key and a separate short public identifier:

```sql
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE
```

- Use `id` for internal joins, foreign keys, repository lookups, and database performance.
- Use `uuid` for API payloads, frontend routing, public references, and anything exposed outside the persistence layer.
- At present, public IDs are 8 uppercase alphanumeric characters generated through the shared public UUID helper. When scale or collision risk grows, move new public IDs to 16 characters with a planned migration.
- Do not use the public `uuid` as the primary key unless the architecture rules are intentionally changed.

## Multi-Tenant Runtime

The current runtime follows this path for tenant-owned data:

```text
request URL host/domain
  -> platform tenant_domains table
  -> platform tenants table
  -> auth JWT + platform user_tenants access check
  -> per-tenant MariaDB connection
  -> tenant-local tables
```

Platform/master data lives in the MariaDB database configured by `DB_*` environment variables and is represented by `apps/server/src/infrastructure/database/schema.ts`. Platform database modules live beside their owning modules, then register through `apps/server/src/infrastructure/database/platform-modules.ts`.

Tenant-local data lives in MariaDB databases described by each tenant row. Tenant connection/provisioning code lives under `apps/server/src/infrastructure/tenant-database/`. Tenant database schema types live in `tenant-database.schema.ts`.

Current surface ownership:

- `tenant-domain`: platform domain-to-tenant resolution.
- `tenant`: platform tenant records, tenant diagnostics, startup provisioning input.
- `auth`: platform users, user-tenant access, JWT issuance.
- `industry`: platform master data shared across tenants.
- `company`: tenant-owned data; must use `TenantContextService`.

## Multi-Tenant Public Pages

Public/static tenant pages must use the shared domain-resolution path instead of hand-rolled host checks in the frontend.

```text
browser host/domain
  -> GET /api/site/tenant-static
  -> DomainResolutionEngine
  -> tenant_domains + tenants
  -> tenant app settings
  -> frontend public page scaffold
```

- Keep domain normalization and tenant app selection in `DomainResolutionEngine`.
- Public tenant pages must fail closed when no active tenant domain is mapped. Do not fall back to platform content for tenant domain requests.
- The frontend can render many tenant websites from one codebase, but it must not decide tenant identity by local string matching alone.
- Tenant-owned private/business data still goes through authenticated tenant APIs and `TenantContextService`; public static pages are only the public entry surface.
- Add new industry pages as feature-pack scaffolds first, then connect tenant-local APIs only when the authenticated tenant boundary is ready.
- Treat every client as its own domain-scoped tenant, even when hosted under a shared `*.codexsun.com` wildcard.
- Tenant capabilities come from tenant app options, industry settings, and optional customization metadata; avoid shared-domain behavior that mixes client scope.

## Dashboard Boundaries

Frontend dashboard routing must remain split by role:

- `super-admin` is platform orchestration and can reach platform management surfaces.
- `admin` is software operations and should focus on bugs, helpdesk, client notes, and updates.
- Tenant users are isolated to enabled tenant-local application desks and their selected company/accounting-year context.

When adding a dashboard page, first decide which dashboard mode owns it. Avoid relying only on hidden menu items; route guards should also reject pages outside the active dashboard mode.

Dashboard route families are:

- `/app/*` for tenant/client users with `/login`.
- `/admin/*` for admin/helpdesk users with `/admin/login`.
- `/sa/*` for super admins with `/sg/login` and `/sa/login` as an alias.

Each surface must keep its own auth storage key and auth gate. Do not let a tenant login unlock admin or super-admin routes.

## Frontend Structure

The active frontend lives in `apps/frontend/src`.

Preferred growth pattern:

```
apps/frontend/src/
├── app/             # App shell, routing, providers
├── features/        # User-facing feature areas
├── components/      # Shared UI components
├── assets/          # App-owned visual assets
├── App.tsx
└── main.tsx
```

Keep UI feature code in `apps/frontend` until a separate reusable package is intentionally introduced.

## Frontend Module Page Routing

- Every concrete user-facing module page must be routed to its own feature-owned page component under `apps/frontend/src/features/<module>/`.
- Route module pages explicitly from the dashboard/router to that feature page. Do not hide module ownership behind a generic page switch.
- Shared pages and registries, such as master-data or common-data screens, may provide reusable primitives and generic fallback behavior only.
- Do not grow generic pages with module-specific `if/else` branches for columns, filters, lookups, form layout, tabs, print behavior, or detail views.
- When a module needs custom behavior, create or extend that module's standalone page instead. Keep product code in product, contact code in contact, company code in company, sales code in sales, and so on.

## Cross-App Communication

```
frontend / future clients
          |
          | HTTP/WS
          v
apps/server
          |
          v
database / infrastructure

@cxsun/shared supplies shared types, constants, and pure utilities only.
```

Cross-app transaction rule:

- App modules and public app surfaces must not write another app's transaction tables directly.
- Ecommerce, B2B Connect, auditor, sports, learning, welfare, brand storefront, and industry apps must call server-owned services/engines for billing, accounting, compliance, inventory, mail, files, and reporting.
- Correct shape: `app use case -> shared service/engine -> tenant module tables/postings`.
- Wrong shape: `app use case -> direct insert into another app's ledger/invoice/posting tables`.

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

## Environment Variables

Root `.env` feeds local development. Never commit real secrets.

- `VITE_*` is consumed by `apps/frontend`.
- `EXPO_PUBLIC_*` is reserved for `packages/mobile`.
- `ELECTRON_*` is reserved for `packages/desktop`.
- Server variables are consumed by `apps/server`.

Current default local ports:

- Frontend: `6010`
- Server: `6005`
- Docs: `6020`
- Product app shells: auditor `6030`, ecommerce `6031`, B2B Connect `6032`, sports `6033`, learning `6034`, welfare `6035`, CRM `6036`, sites `6037`, blog `6038`, ZETRO `6039`, textile lab `6040`, garment `6041`, UPVC `6042`.
- Future public/product apps may run on separate local ports to avoid route/feature confusion while staying in one repo and one server-managed platform. See `assist/context/one-platform-multi-app.md` for the owned-domain/app port plan.

GST and domain deployment rules:

- Keep global GSP client credentials in database-backed Super Admin GST provider settings, split by sandbox/production and credential purpose. Do not restore obsolete WhiteBooks client-id/client-secret environment variables.
- Tenant GST settings own tenant-specific GST username, password, GSTIN, and sandbox/production selection.
- `GSP_SANDBOX_BASE_URL` may remain an environment-level provider endpoint default; secrets must not be committed.
- Cloud/Docker reinstall must not create tenant domains automatically unless `AUTO_SEED_TENANT_DOMAINS=true` is explicitly set.
