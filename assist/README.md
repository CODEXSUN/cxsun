# AI Agent Assist System

**Project version:** 1.0.131

This directory is the working guide for AI agents on `cxsun`. The repository has been cleaned down to the active billing application.

## Current Application Shape

<<<<<<< Updated upstream
For owned-product and industry-app expansion, read `assist/context/one-repo-multi-backend.md`. It records the current target: one repo for development, multiple backend services for deployment, separate app surfaces and ports/domains for different business experiences, shared Platform API contracts, and tenant database table groups by app owner.
=======
```text
cxsun/
├── apps/
│   ├── cli/        # local workflow scripts
│   ├── frontend/   # active React + Vite billing frontend
│   └── server/     # active Node.js/Fastify backend
├── packages/
│   └── shared/     # shared framework-free types, constants, and utilities
└── assist/         # rules, context, and task notes
```
>>>>>>> Stashed changes

Root scripts use only the active workspaces:

- `npm run dev` starts `apps/server` and `apps/frontend`.
- `npm run dev:server` starts only the backend.
- `npm run dev:frontend` starts only the frontend.
- `npm run typecheck:active` typechecks server, frontend, and shared.
- `npm run build:active` builds server and frontend into the root `build/` folder.
- `npm run check` runs active typechecks and builds.

For the deployment cleanup direction, read `assist/context/one-repo-multi-backend.md`. It records the target shape: one monorepo, multiple independently deployable backend services, shared Platform API, and one tenant database with separated `core_*`, `billing_*`, `ecommerce_*`, `crm_*`, and `sites_*` table groups. `apps/server` is now a temporary combined backend; extract Platform API first and Billing API second.

## Mandatory Reading Before Work

Before planning, coding, changing schemas, or editing product behavior, read:

1. `assist/README.md`
2. All files under `assist/rules/`
3. All files under `assist/context/`
4. `assist/execution/planning.md`
5. `assist/execution/task.md`
<<<<<<< Updated upstream
6. `assist/execution/service-split-plan.md` for work that touches Billing, Ecommerce, CRM, Sites, Core, CXSync, deployment, tenant provisioning, or schema boundaries
7. The execution document for the requested product or module
8. The relevant module documentation under `apps/server`, `apps/frontend`, `apps/docs`, or the standalone product app

For Billing API work, the following files are also mandatory because Billing now has native service ownership separate from the old combined backend:

1. `apps/billing-api/BILLING-API.md` — standalone service boundary, mounted support routes, test commands, and transition rules.
2. Every module document under `apps/billing-api/src/modules/**/*.md`, including the detailed entry documents such as `SALESENTRY.md`, `QUOTATIONENTRY.md`, `PURCHASEENTRY.md`, `RECEIPTENTRY.md`, `PAYMENTENTRY.md`, `ACCOUNTS.md`, and stock documents.
3. `apps/docs/devdocs/modules/billing-api.md` when public/developer-facing API behavior changes.
4. The matching frontend feature documentation under `apps/frontend/src/features/**` when a Billing route change affects the UI contract.

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
- `npm run dev:platform-api` starts the new Platform API extraction scaffold.
- `npm run dev:billing-api` starts the new Billing API extraction service on port `6205`.
- `npm run dev:sites-api` starts the Sites API public-content service on port `6405`.
- `npm run dev:billing-stack` starts Platform API, Billing API, Sites API, and the frontend together with labeled concurrent logs.
- Dev preflight automatically stops an existing listener on the app's configured port, waits for the port to be released, and reuses the same port; set `CXSUN_DEV_PORT_POLICY=abort` to fail instead.
- Local API logs use a compact readable format; set `CXSUN_LOG_FORMAT=json` to retain structured JSON during development. Production always uses JSON logs.
- `npm run dev:frontend` starts only the frontend.
- `npm run dev:desktop` starts the Electron shell against the configured frontend/API.
- `npm run dev:docs` starts only the Docusaurus docs app.
- `npm run dev:cxsync` starts CXSync Desktop and CXSync Cloud together.
- `npm run dev:<product-app>` starts one scaffolded product app, such as `dev:auditor`, `dev:ecommerce`, `dev:b2b-connect`, `dev:b2b-connect-admin`, `dev:sports`, `dev:learning`, `dev:welfare`, `dev:crm`, `dev:sites`, `dev:blog`, `dev:zetro`, `dev:textile-lab`, `dev:garment`, or `dev:upvc`.
- `npm run dev:product-apps` starts all scaffolded product app shells together.
- `npm run codeit:run` starts the experimental CodeIT backend/frontend pair.
- `npm run check` runs the standard assist verification script.
- `npm run typecheck:active` typechecks all current workspaces.
- `npm run typecheck:product-apps` typechecks all scaffolded product app shells.
- `npm run build:active` builds the active backend and frontend apps.
- `npm run build:platform-api` builds the new Platform API extraction scaffold.
- `npm run build:billing-api` builds the new Billing API extraction service.
- `npm run build:desktop` builds the Windows Electron installer with bundled frontend assets.
- `npm run e2e:desktop` builds the bundled frontend and verifies the Electron runtime API base defaults to `http://codexsun.local:6005`.
- `npm run build:product-apps` builds all scaffolded product app shells.
- `npm run version:bump -- --title "<title>"` updates package/display versions and creates a changelog entry split into `Database Changes` and `App Codebase Changes`; use `--database-update` or `--no-database-update` when the automatic database check needs an override.
=======
6. Relevant module documentation under `apps/server` or `apps/frontend`

Copy the exact user prompt into `assist/documentation/prompt-review.md` before starting implementation work.
>>>>>>> Stashed changes

## Current Tenant Architecture

The active backend separates platform data from tenant data.

- Master MariaDB stores site content, industries, tenants, tenant domains, platform users, RBAC policy catalogs, tenant policy toggles, and queue jobs.
- Tenant MariaDB databases store tenant-local companies, accounting years, default company selection, entries, accounts, settings, mail, and tenant-local RBAC role-policy assignments.
- Application tables keep `id INT AUTO_INCREMENT PRIMARY KEY` for internal joins and `uuid CHAR(8) NOT NULL UNIQUE` for public/API references.
- Tenant request path: `URL host/domain -> tenant_domains -> tenants -> JWT/user_tenants check -> tenant database`.
- `TenantContextService` is the runtime gateway for tenant-owned APIs.
- `TenantDatabaseProvisioner` prepares MariaDB-backed tenant databases during server startup.

## Current Backend Boundary Layout

- `apps/server/src/core`: framework/runtime primitives plus platform/core modules.
- `apps/server/src/shared`: backend-only shared helpers such as filters, guards, and middleware.
- `apps/server/src/infrastructure`: database, queue, tenant provisioning, auth helpers, and lifecycle adapters.
<<<<<<< Updated upstream
- `apps/server/src/modules/foundation`: reusable engines and compatibility registries (`master-record`, `master-data`).
- Future cross-product engines/services should stay service-owned and be reused through contracts. Platform API owns shared platform needs such as auth, tenant, RBAC, mail, notification, files, app enablement, and audit. Billing, Ecommerce, CRM, Sites, and CXSync should become separately deployable backend services inside the monorepo, with each service owning only its app schema group.
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
- `packages/ui`: reusable UI primitives, rich components, dashboard shell pieces, and design-system helpers used across app workspaces.
- `apps/cxsync` and `apps/cxsync-cloud`: isolated CXSync maintenance apps for audit, clone, mirror, dump, diagnostics, and migration rehearsal.
- `apps/codeit/backend` and `apps/codeit/frontend`: experimental CodeIT workspaces.

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
=======
- `apps/server/src/modules/foundation`: reusable engines and compatibility registries.
- `apps/server/src/modules/common/<group>/<module>`: standalone common tenant modules.
- `apps/server/src/modules/master/<module>`: standalone master modules.
- `apps/server/src/modules/entries/<module>`: tenant-isolated transaction modules.
- `apps/server/src/modules/accounts`: accounting engine, ledgers, vouchers, reports, and posting support.
- `apps/server/src/modules/settings`: company settings and document numbering.
- `apps/server/src/modules/mail`: tenant SMTP settings, queued messages, attachments, events, and delivery.
>>>>>>> Stashed changes

## Dashboard Boundaries

The frontend dashboard is split by authenticated role:

- `super-admin`: platform orchestration for tenant, domain, industry, system update, user manager, and tenant-owned diagnostics.
- `admin`: software operations, support, bugs, and helpdesk work.
- Tenant roles: isolated client application desks such as Billing, Accounts, Inventory, Mail, Media, Sites, and Task Manager according to enabled company settings.

Route families:

- Tenant/client surface: `/app/*`, login `/login`.
- Admin helpdesk surface: `/admin/*`, login `/admin/login`.
- Super-admin surface: `/sa/*`, login `/sg/login`; `/sa/login` is accepted as an alias.

Each route family uses its own browser session key and route guard.

## Billing Desk Behavior

<<<<<<< Updated upstream
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

## Documentation And Version Discipline

- Update relevant docs and `assist/documentation/CHANGELOG.md` at each meaningful stage of progress.
- Keep changelog bullets specific and place them under the latest current-version entry unless the user explicitly asks for a version bump.
- Never bump package/app versions, release tags, lockfile versions, or the changelog `Version State` block unless the user explicitly commands a version bump.
- For the full rule, read `assist/rules/versioning.md` before implementation work.

## Key References

- `assist/context/workspaces.md` maps each workspace to its role and commands.
- `assist/context/product-picture.md` describes the product picture and implementation direction.
- `assist/context/one-repo-multi-backend.md` records the newer target cleanup direction: one repo, multiple backend services, shared Platform API, separate deploy units, and tenant table groups.
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
=======
- Selected default company and accounting year control billing lists, reports, overview totals, month summaries, and document numbering context.
- Domestic Sales and Export Sales are separate entry modules and database tables.
- Export Sales stores a selected Common Currency reference and saved currency name.
- Sales Settings -> Features owns the company-level `feature-export-sales` switch.
- Entry PDF email delivery captures the visible print document, queues it through tenant Mail, stores retryable temporary PDFs under `storage/<tenant>/public/pdf`, and removes them after successful delivery.
>>>>>>> Stashed changes

## Verification

Use targeted workspace commands while developing, then run:

```bash
npm run check
```
