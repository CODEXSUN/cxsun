# AI Agent Assist System

**Project version:** 1.0.131

This directory is the working guide for AI agents on `cxsun`. The repository has been cleaned down to the active billing application.

## Current Application Shape

```text
cxsun/
â”œâ”€â”€ apps/
â”‚   â”œâ”€â”€ cli/        # local workflow scripts
â”‚   â”œâ”€â”€ frontend/   # active React + Vite billing frontend
â”‚   â””â”€â”€ server/     # active Node.js/Fastify backend
â”œâ”€â”€ packages/
â”‚   â””â”€â”€ shared/     # shared framework-free types, constants, and utilities
â””â”€â”€ assist/         # rules, context, and task notes
```

Root scripts use only the active workspaces:

- `npm run dev` starts `apps/server` and `apps/frontend`.
- `npm run dev:server` starts only the backend.
- `npm run dev:frontend` starts only the frontend.
- `npm run typecheck:active` typechecks server, frontend, and shared.
- `npm run build:active` builds server and frontend into the root `build/` folder.
- `npm run check` runs active typechecks and builds.

## Mandatory Reading Before Work

Before planning, coding, changing schemas, or editing product behavior, read:

1. `assist/README.md`
2. All files under `assist/rules/`
3. All files under `assist/context/`
4. `assist/execution/planning.md`
5. `assist/execution/task.md`
6. Relevant module documentation under `apps/server` or `apps/frontend`

Copy the exact user prompt into `assist/documentation/prompt-review.md` before starting implementation work.

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
- `apps/server/src/modules/foundation`: reusable engines and compatibility registries.
- `apps/server/src/modules/common/<group>/<module>`: standalone common tenant modules.
- `apps/server/src/modules/master/<module>`: standalone master modules.
- `apps/server/src/modules/entries/<module>`: tenant-isolated transaction modules.
- `apps/server/src/modules/accounts`: accounting engine, ledgers, vouchers, reports, and posting support.
- `apps/server/src/modules/settings`: company settings and document numbering.
- `apps/server/src/modules/mail`: tenant SMTP settings, queued messages, attachments, events, and delivery.

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

- Selected default company and accounting year control billing lists, reports, overview totals, month summaries, and document numbering context.
- Domestic Sales and Export Sales are separate entry modules and database tables.
- Export Sales stores a selected Common Currency reference and saved currency name.
- Sales Settings -> Features owns the company-level `feature-export-sales` switch.
- Entry PDF email delivery captures the visible print document, queues it through tenant Mail, stores retryable temporary PDFs under `storage/<tenant>/public/pdf`, and removes them after successful delivery.

## Verification

Use targeted workspace commands while developing, then run:

```bash
npm run check
```
