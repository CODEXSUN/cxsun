# AI Agent Assist System

**Project version:** 1.0.125

This directory is the working guide for AI agents on `cxsun`. It records project rules, current architecture, session plans, task tracking, and release notes.

For the product north star, read `assist/context/product-picture.md`. It describes the software we are building: public storefront/content, tenant business workspace, admin support desk, super-admin platform orchestration, and the new Versatile Agent OS direction.

For owned-product and industry-app expansion, read `assist/context/one-platform-multi-app.md`. It records the one-repo, one-server, multi-app rule: separate app surfaces and ports/domains for different business experiences, shared engines/services for billing, accounting, mail, CRM, sites/blog, payments, files, auth, tenant/company, ZETRO, and GST/compliance.

For the marketplace boundary, read `assist/context/tirupur-connect-boundary.md`. It is the canonical rule that TConnect is the billing connector while Tirupur Connect is the standalone central marketplace.

For the AI operating layer, read `assist/context/versatile-agent-os.md` and `ZRO/Vision/agent-os.md`. The agent direction is layered: Helper Agent first, then Operator, Workflow, Planner, Analytics, Router, Memory, and the full multi-agent ecosystem.

## Mandatory Reading Before Work

Before planning, coding, changing schemas, or editing product behavior, every AI agent must read:

1. `assist/README.md`
2. All files under `assist/rules/`
3. All files under `assist/context/`
4. `assist/execution/planning.md`
5. `assist/execution/task.md`
6. The execution document for the requested product or module
7. The relevant module documentation under `apps/server`, `apps/frontend`, `apps/docs`, or the standalone product app

For any TConnect or Tirupur Connect work, the following files are mandatory and must be read in this order:

1. `assist/context/tirupur-connect-boundary.md` — canonical ownership and system boundary.
2. `assist/execution/tirupur-connect-implementation-plan.md` — safe implementation and migration order.
3. `assist/execution/b2b-connect.md` — Tirupur Connect product plan.
4. `apps/b2b-connect/b2b-connect.md` — detailed product vision and feature scope.
5. `apps/docs/devdocs/modules/tconnect.md` — connector-facing developer documentation.
6. `assist/execution/tconnect.md` — legacy mixed-module plan for migration reference only; superseded wherever it conflicts with the canonical boundary.

Agents must not begin TConnect or Tirupur Connect implementation from the legacy `assist/execution/tconnect.md` document alone.

## Current Application Shape

The live workspace is a TypeScript monorepo with npm workspaces:

```
cxsun/
├── apps/
│   ├── server/      # Active Node.js/Fastify backend
│   ├── frontend/    # Active React + Vite frontend
│   ├── docs/        # Active Docusaurus project documentation
│   └── cli/         # Local workflow helpers
├── packages/
│   ├── shared/      # Shared types, constants, and pure utilities
│   ├── web/         # Reserved web package
│   ├── desktop/     # Active Electron desktop application
│   └── mobile/      # Reserved Expo package
└── assist/          # AI rules, context, templates, and session tracking
```

Root scripts use the active apps:

- `npm run dev` starts `apps/server`, `apps/frontend`, and `apps/docs` together with concurrent logs.
- `npm run dev:server` starts only the backend.
- `npm run dev:frontend` starts only the frontend.
- `npm run dev:desktop` starts the Electron shell against the configured frontend/API.
- `npm run dev:docs` starts only the Docusaurus docs app.
- `npm run dev:<product-app>` starts one scaffolded product app, such as `dev:auditor`, `dev:ecommerce`, `dev:b2b-connect`, `dev:sports`, `dev:learning`, `dev:welfare`, `dev:crm`, `dev:sites`, `dev:blog`, `dev:zetro`, `dev:textile-lab`, `dev:garment`, or `dev:upvc`.
- `npm run dev:product-apps` starts all scaffolded product app shells together.
- `npm run check` runs the standard assist verification script.
- `npm run typecheck:active` typechecks all current workspaces.
- `npm run typecheck:product-apps` typechecks all scaffolded product app shells.
- `npm run build:active` builds the active backend and frontend apps.
- `npm run build:desktop` builds the Windows Electron installer with bundled frontend assets.
- `npm run e2e:desktop` builds the bundled frontend and verifies the Electron runtime API base defaults to `http://codexsun.local:6005`.
- `npm run build:product-apps` builds all scaffolded product app shells.
- `npm run version:bump -- --title "<title>"` updates package/display versions and creates a changelog entry split into `Database Changes` and `App Codebase Changes`; use `--database-update` or `--no-database-update` when the automatic database check needs an override.

## Current Tenant Architecture

The active backend separates platform data from tenant data.

- Master MariaDB stores site content, industries, tenants, tenant domains, admin users, platform RBAC policy catalog, tenant policy toggles, and queue jobs.
- Tirupur Connect uses its own `tirupur_connect_db` MariaDB database for marketplace, public/member/admin, frontend designer, content, and audit records.
- Tenant MariaDB databases store tenant-local companies, company child tables, accounting years, default company selection, and tenant-local RBAC role-policy assignments.
- Application tables keep `id INT AUTO_INCREMENT PRIMARY KEY` for internal joins and `uuid CHAR(8) NOT NULL UNIQUE` for public/API references. New public IDs are 8-character uppercase alphanumeric values from the shared public UUID helper; plan 16-character public IDs later when growth requires it.
- The request path for tenant data is `URL host/domain -> tenant_domains -> tenants -> JWT/user_tenants check -> tenant database`.
- `TenantContextService` is the runtime gateway for tenant-owned APIs. Company APIs already use it and require authenticated requests.
- `TenantDatabaseProvisioner` runs on server startup and prepares every MariaDB-backed tenant database before the API starts listening.

Current backend boundary layout:

- `apps/server/src/core`: framework/runtime primitives plus platform/core modules (`tenant`, `tenant-domain`, `industry`, `health`, `system/system-update`).
- `apps/server/src/shared`: backend-only shared helpers such as filters, guards, and middleware.
- `apps/server/src/infrastructure`: database, queue, tenant provisioning, auth helpers, and lifecycle adapters.
- `apps/server/src/modules/foundation`: reusable engines and compatibility registries (`master-record`, `master-data`).
- Future cross-product engines/services should stay server-owned and be reused by app modules. Ecommerce, auditor, sports, learning, welfare, B2B Connect, and industry apps must call shared billing/accounting/compliance services for invoices, receipts, vouchers, postings, mail, and reports instead of duplicating that logic.
- `packages/app-shell`: shared frontend scaffold used by product app workspaces such as auditor, ecommerce, B2B Connect, sports, learning, welfare, CRM, sites, blog, ZETRO, textile lab, garment, and UPVC.
- `apps/server/src/modules/common/<group>/<module>`: standalone common tenant modules.
- `apps/server/src/modules/master/<module>`: standalone master modules (`company`, `contact`, `product`, `order`).
- `apps/server/src/modules/entries/<module>`: tenant-isolated transaction modules including sales, export sales, purchase, receipt, and payment.
- `apps/server/src/modules/auditor/contact-credential`: tenant-isolated credentials attached separately to Contact master records.
- `apps/server/src/modules/auditor/gst-filing`: tenant-isolated monthly GSTR-1/GSTR-3B filing tracker for Contact master records.
- `apps/server/src/modules/gst/gst-compliance`: tenant GST credentials, global GSP provider credentials, token state, and compliance operations.
- `apps/server/src/modules/tirupur-connect`: standalone marketplace using `tirupur_connect_db`, never the master or tenant databases.
- `apps/server/src/modules/mail`: tenant SMTP settings, queued messages, attachment metadata, events, and delivery.
- `apps/server/src/modules/settings`: company software settings and document numbering.

Current important API surfaces:

- `POST /api/v1/auth/login`
- `GET /api/v1/tenant-domains/resolve`
- `GET /api/v1/tenant-domains`
- `POST /api/v1/tenant-domains/upsert`
- `GET /api/v1/tenants/context`
- `GET/POST /api/v1/industries`
- `GET/POST /api/v1/tenants`
- `GET/POST /api/v1/companies`
- `GET/POST /api/v1/contacts`
- `GET/POST /api/v1/products`
- `GET/POST /api/v1/orders`
- `GET/POST /api/v1/common/<moduleKey>`
- `GET/POST /api/v1/entries/sales`
- `GET/POST /api/v1/entries/export-sales`
- `GET/POST /api/v1/auditor/contact-credentials`
- `GET/POST /api/v1/auditor/gst-filings`
- `GET/PATCH /api/v1/company-settings/<key>`
- `GET/PATCH/POST /api/v1/gst-compliance/*`
- `GET/PATCH/POST /api/v1/mail/*`

## Dashboard Boundaries

The active frontend dashboard is split by authenticated role:

- `super-admin` sees two orchestration areas: Platform / Master Database for tenant, domain, industry, system update, and admin user manager; Tenant Database for tenant-owned modules such as company.
- `admin` sees the software operations dashboard for helpdesk, bugs, and update/support work.
- Tenant roles (`admin`, `manager`, `staff`, and `user`) use isolated application desks such as Application, Billing, Accounts, Inventory, Mail, Media, Sites, and Task Manager according to enabled app and company feature settings. The `super-admin` role is reserved for the platform owner account.

Billing desk behavior:

- The selected default company and accounting year control billing lists, reports, overview totals, month summaries, and document numbering context.
- Domestic Sales and Export Sales are separate entry modules and database tables.
- Export Sales stores a selected Common Currency reference and saved currency name.
- Sales Settings -> Features owns the company-level `feature-export-sales` switch. When disabled, Export Sales is hidden from navigation, shortcuts, overview totals/month table, direct routes, and document settings without deleting existing records.
- Entry PDF email delivery captures the exact visible print document, queues it through tenant Mail, stores retryable temporary PDFs under `storage/<tenant>/public/pdf`, and removes them after successful delivery.

Keep these boundaries explicit when adding pages. Do not add platform orchestration pages to the tenant dashboard.

Route families:

- Tenant/client surface: `/app/*`, login `/login`.
- Admin helpdesk surface: `/admin/*`, login `/admin/login`.
- Super-admin surface: `/sa/*`, login `/sg/login`; `/sa/login` is accepted as an alias.

Each route family uses its own browser session key and route guard.

## Directory Structure

```
assist/
├── README.md          # This file, system overview
├── rules/             # AI behavior, coding, git, versioning, architecture, verification
├── templates/         # Templates for commits, pull requests, and server modules
├── scripts/           # Helper scripts for agent workflows
├── context/           # Long-term project context, decisions, and workspace map
├── agents/            # Role-specific agent configurations
├── execution/         # Current session plan and task checklist
└── documentation/     # Changelog, prompt review, and other docs
```

## Session Startup

At the start of each work session:

1. Read this file.
2. Complete the mandatory reading list above.
3. Read the relevant product/module execution and module documentation.
4. Refresh `assist/execution/planning.md` and `assist/execution/task.md` for the current session.
5. Copy the exact user prompt into `assist/documentation/prompt-review.md` before starting the requested work.
6. Inspect the current implementation and Git worktree before making changes.
7. Preserve unrelated user changes and follow the applicable verification rules.

## Key References

- `assist/context/workspaces.md` maps each workspace to its role and commands.
- `assist/context/product-picture.md` describes the product picture and implementation direction.
- `assist/context/one-platform-multi-app.md` records the one-repo, one-server, many app surfaces, shared engine/service architecture for owned domains and industry products.
- `assist/context/tirupur-connect-boundary.md` defines TConnect connector ownership, Tirupur Connect marketplace ownership, source provenance, identity, APIs, and migration constraints.
- `assist/execution/tirupur-connect-implementation-plan.md` defines the phased extraction, central marketplace foundation, immutable sync contract, administration, and data migration.
- `assist/execution/b2b-connect.md` records the Tirupur Connect product and revenue plan under the corrected boundary.
- `apps/b2b-connect/b2b-connect.md` records the full Tirupur Connect ecosystem vision and feature scope.
- `apps/docs/devdocs/modules/tconnect.md` documents the connector responsibilities and explicit non-responsibilities.
- `assist/execution/tconnect.md` is retained only as legacy migration context and must never override the canonical boundary.
- `assist/context/live-client-scope.md` records the first real tenant/client, industry, app, and domain scope.
- `assist/rules/architecture.md` describes current app placement and module boundaries.
- `assist/context/versatile-agent-os.md` describes how the Versatile Agent OS should be implemented inside the current monorepo.
- `assist/rules/verification.md` describes required checks by change type.
- `assist/templates/server-module.md` gives the preferred backend module layout.

## Verification

Use targeted workspace commands while developing, then run the standard check before finalizing meaningful changes:

```
npm run check
```
