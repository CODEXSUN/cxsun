# Architecture Context

This file records the current project shape and decisions that should guide future AI-assisted work.

<<<<<<< Updated upstream
Read `assist/context/product-picture.md` alongside this file for the product-level picture of what CXSun is becoming.

## Decision Records

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-14 | Use `apps/server` as the only active backend workspace. | `packages/server` was removed after a workspace naming collision; root scripts and CLI helpers now target `apps/server`. |
| 2026-05-14 | Use `apps/frontend` as the active React + Vite frontend. | The runnable UI is under `apps/frontend`; `packages/web` remains a reserved placeholder. |
| 2026-05-14 | Keep `packages/shared` framework-free. | Shared code should be portable across frontend, server, desktop, and mobile clients. |
| 2026-05-14 | Keep reserved packages minimal but typecheckable. | Placeholder packages should not break standard workspace verification. |
| 2026-05-15 | Use platform SQLite plus tenant MariaDB databases. | Historical decision; replaced on 2026-05-24 when master/platform persistence moved to MariaDB. |
| 2026-05-24 | Use MariaDB for both master/platform persistence and tenant-isolated databases. | Platform metadata now uses the same deployable database engine as tenants, avoiding SQLite concurrency and deployment limits while preserving tenant database isolation. |
| 2026-05-15 | Split dashboards into super-admin, admin, and tenant modes. | Platform orchestration, software support operations, and tenant-isolated company/RBAC work have different responsibilities and should not share one mixed dashboard. |
| 2026-05-16 | Keep framework/platform modules in `core`, reusable record engines in `modules/foundation`, and business modules in bounded module groups. | The backend now separates core runtime, shared helpers, foundation primitives, master, common, and entries so modules can be reused, dropped, or enhanced independently. |
| 2026-05-16 | Use `id INT AUTO_INCREMENT PRIMARY KEY` plus `uuid CHAR(8) NOT NULL UNIQUE` on application tables. | Numeric IDs stay fast and stable for internal joins, while short uppercase alphanumeric public UUIDs hide sequence IDs from APIs and UI. Move public UUIDs to 16 characters later when scale requires it. |
| 2026-05-22 | Route user-facing frontend modules to feature-owned standalone pages. | Product, contact, company, sales, and future modules should keep custom UI behavior inside their own feature pages instead of expanding generic master-data/common-data pages with module-specific branches. |
| 2026-06-06 | Keep Export Sales separate from domestic Sales and gate its visibility with a company feature setting. | Export invoices need separate persistence, numbering, currency selection, print/mail workflows, and optional visibility without deleting stored records. |
| 2026-06-11 | Build Versatile Agent as layered Agent OS. | Start with read-only Helper Agent and add Operator, Workflow, Planner, Analytics, Router, Memory, and ecosystem layers only after logs and typed tools exist. |
| 2026-06-16 | Keep owned products and industry apps in one repo with separate app surfaces/ports/domains. | The current team is small, so one monorepo is easier to manage; clean app boundaries and shared contracts keep ecommerce, B2B Connect, sports, learning, welfare, auditor, and industry apps extensible without duplicating billing/accounting/compliance logic. |
| 2026-06-18 | Separate TConnect from Tirupur Connect as bounded systems. | TConnect is only the billing connector; Tirupur Connect is a tenant-independent central marketplace with its own identity, persistence, public/member APIs, and dedicated administration. |
| 2026-06-18 | Activate `packages/desktop` as the Electron client. | The packaged frontend must open from local assets without internet access while continuing to use the configured API and MariaDB architecture. |
| 2026-06-18 | Default Electron API access to `codexsun.local:6005`. | Desktop should follow the same host/domain tenant-resolution path as browser deployments while still allowing `ELECTRON_API_BASE_URL` overrides per client machine. |
| 2026-06-25 | Keep one repo but move toward multiple backend services and deploy units. | Billing, Ecommerce, CRM, Sites, Core, and CXSync need independent release paths so unfinished work in one area does not block a small safe fix in another area. |

=======
>>>>>>> Stashed changes
## Active Workspaces

- `apps/server` (`@cxsun/server`): active backend API using Fastify and the custom `core/` decorator/bootstrap layer.
- `apps/frontend` (`@cxsun/frontend`): active React + Vite frontend using Tailwind CSS and shadcn-style UI primitives.
<<<<<<< Updated upstream
- `apps/docs` (`@cxsun/docs`): active Docusaurus documentation app.
- `apps/cxsync` (`@cxsun/cxsync`): active CXSync Desktop maintenance app.
- `apps/cxsync-cloud` (`@cxsun/cxsync-cloud`): active isolated CXSync Cloud maintenance API.
- `apps/cli` (`@cxsun/cli`): local helper scripts such as preflight port checks and GitHub helpers.
- `packages/shared` (`@cxsun/shared`): shared types, constants, and pure utilities.
- `packages/ui` (`@cxsun/ui`): shared UI primitives, rich components, dashboard shell pieces, and design-system helpers.
- `packages/desktop` (`@cxsun/desktop`): active Electron client that packages the React frontend and connects to the configured CXSun API, defaulting to `http://codexsun.local:6005` for domain-based tenant resolution.
- `apps/codeit/backend` and `apps/codeit/frontend`: experimental CodeIT app workspaces.
=======
- `apps/cli` (`@cxsun/cli`): local helper scripts such as preflight port checks, database backup helpers, build helpers, and GitHub helpers.
- `packages/shared` (`@cxsun/shared`): shared framework-free types, constants, and pure utilities.
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`
- `npm -w apps/docs run typecheck`
- `npm -w packages/shared run typecheck`
- `npm -w packages/ui run typecheck`
- `npm -w packages/app-shell run typecheck`
- `npm -w packages/web run typecheck`
- `npm -w packages/desktop run typecheck`
- `npm -w packages/mobile run typecheck`
- `npm -w apps/server run build`
- `npm -w apps/frontend run build`
=======
```bash
npm -w apps/server run typecheck
npm -w apps/frontend run typecheck
npm -w packages/shared run typecheck
npm run build:active
```
>>>>>>> Stashed changes

## Backend Placement

- Put server business modules under `apps/server/src/modules`.
<<<<<<< Updated upstream
- Put backend framework code and platform/core modules under `apps/server/src/core`.
- Put backend cross-cutting shared helpers under `apps/server/src/shared`.
- Put reusable generic module engines under `apps/server/src/modules/foundation`.
- Put standalone master modules under `apps/server/src/modules/master`.
- Put business common modules under `apps/server/src/modules/common/<group>/<module>`.
- Put tenant entries under `apps/server/src/modules/entries`; current billing entry modules include sales, export sales, purchase, receipt, and payment.
- Put future owned-product and industry modules under clear app/module boundaries, but route shared transaction work through billing, accounting, compliance, inventory, mail, file, CRM, site/blog, tenant/company, subscription, and Agent OS service contracts.
- Treat `apps/server` as the transition backend. New backend work should keep Core/Billing extraction in mind rather than deepening mixed ownership.
- Put infrastructure configuration and lifecycle code under `apps/server/src/infrastructure`.
- Put platform database migration/seed modules beside the owning backend module and register them in `apps/server/src/infrastructure/database/platform-modules.ts`.
- Put Agent OS backend work under `apps/server/src/modules/agent-os`; start platform-wide tables such as `conversations`, `agent_logs`, and `knowledge_documents` in the master database.
- Put tenant database connection, provisioning, and tenant-local schema types under `apps/server/src/infrastructure/tenant-database`.
- Use `TenantContextService` for tenant-owned APIs. It resolves `x-tenant-code`, JWT tenant code, or host/domain to a tenant, verifies user access, checks tenant policy, and returns the tenant-local database handle.
- Put active frontend UI work under `apps/frontend/src`.
- Route concrete frontend module pages to standalone feature-owned pages under `apps/frontend/src/features/<module>/`; keep generic master/common pages limited to reusable primitives or fallback behavior.
- Put frontend CSS under `apps/frontend/src/assets/css`.
- Use Kysely with MariaDB for platform/master persistence through `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`.
- Use Kysely with MariaDB for tenant-owned data such as companies, company child tables, accounting years, default company records, and tenant-local RBAC role-policy mappings. Tenant databases reuse the same host/user/password env values, while each tenant row owns its own database name.
- Keep `id` as the internal primary key and `uuid` as the public identifier on application-owned tables. Current public UUIDs are 8-character uppercase alphanumeric values generated by the shared helper; plan a 16-character migration later when growth requires it.
- Production build artifacts belong under the root `build/` folder.
- The Docker deploy environment lives under `.container/` and is started with root `docker-compose.yml`.
- Do not move active frontend work into `packages/web` unless the project intentionally reintroduces that package as a real app.
- Do not split owned products into separate repositories by default. Use separate app surfaces, dev ports, production domains, and eventually separate backend deploy units inside the monorepo.
- The newer deployment cleanup target is one repo with multiple backend services: Core, Billing, Ecommerce, CRM, Sites, and CXSync. Keep `apps/server` stable while extracting by contracts. See `assist/context/one-repo-multi-backend.md` and `assist/rules/service-boundaries.md`.
- Keep `modules/tconnect` limited to billing connector responsibilities. Put the central marketplace under `modules/tirupur-connect`; it must not depend on a special marketplace billing tenant. See `assist/context/tirupur-connect-boundary.md`.
=======
- Put framework runtime, decorators, DI, guards, and platform/core modules under `apps/server/src/core`.
- Put backend cross-cutting helpers under `apps/server/src/shared`.
- Put infrastructure configuration and lifecycle code under `apps/server/src/infrastructure`.
- Put reusable generic engines under `apps/server/src/modules/foundation`.
- Put standalone master modules under `apps/server/src/modules/master`.
- Put common business modules under `apps/server/src/modules/common/<group>/<module>`.
- Put tenant entries under `apps/server/src/modules/entries`.
- Put settings and document numbering under `apps/server/src/modules/settings`.
- Use `TenantContextService` for tenant-owned APIs.
>>>>>>> Stashed changes

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
