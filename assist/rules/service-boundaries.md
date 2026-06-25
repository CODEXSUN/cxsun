# Service Boundary Rules

This rulebook records the target cleanup direction for CXSun: one repository, separately deployable backend services, and tenant databases with core tables plus app-owned table groups.

## Core Rule

Keep development in one monorepo, but design each major product as an independently deployable service.

```text
one repo
multiple backend services
multiple frontend apps
one tenant database per tenant
core tables always present
optional app table groups per enabled app
```

Do not split into many repositories unless a product later gets a separate team, release cycle, ownership boundary, or high independent traffic.

## Backend Service Ownership

The target backend services are:

| Service | Owns |
|---------|------|
| `platform-api` | auth, tenant resolution, users, companies, accounting years, RBAC, app registry, mail, notification, files, audit, service tokens |
| `billing-api` | invoices, quotations, receipts, credit/debit notes, document numbering, billing PDFs, billing reports, tax summaries |
| `ecommerce-api` | storefront catalog, carts, checkout, ecommerce orders, online payment handoff, customer order status |
| `crm-api` | leads, pipelines, follow-ups, tasks, customer activity, CRM notes |
| `sites-api` | pages, blog/content, menus, SEO metadata, public site publishing |
| `cxsync-api` | private database audit, clone, mirror, migration rehearsal, controlled upgrade preparation |

Each service may read the minimum allowed `core_*` tables through documented core contracts. It must not write another app's owned tables directly.

## Schema Ownership

Every tenant has one tenant database. Inside that database, use app-owned table groups.

```text
tenant_001
  core_users
  core_companies
  core_accounting_years
  core_rbac_roles
  billing_invoices
  billing_receipts
  crm_leads
  ecommerce_orders
  sites_pages
```

Rules:

- `core_*` tables are always provisioned for every tenant.
- App tables are provisioned only when the app is enabled, unless a migration explicitly pre-provisions them for rollout safety.
- Billing code owns only `billing_*` tables and approved `core_*` reads/writes.
- Ecommerce code owns only `ecommerce_*` tables and approved `core_*` reads/writes.
- CRM code owns only `crm_*` tables and approved `core_*` reads/writes.
- Sites code owns only `sites_*` tables and approved `core_*` reads/writes.
- CXSync must not become a business module. It reads database structure/data only for audit, clone, mirror, and migration operations.

## Cross-Service Communication

Do not share tables as an integration shortcut.

Correct:

```text
ecommerce order confirmed
  -> billing-api create invoice command
  -> billing-api creates billing rows
  -> billing-api returns invoice reference and PDF status
```

Later, queue/event flow is preferred:

```text
ecommerce.order.confirmed
  -> billing service consumes event
  -> billing.invoice.created
  -> ecommerce stores billing reference
```

Wrong:

```text
ecommerce-api inserts billing_invoices directly
crm-api edits ecommerce_orders directly
sites-api reads private billing tables for public page content
```

## Deployment Rule

Small fixes should deploy only the affected service whenever possible.

Examples:

- Billing bug fix: build/test/deploy `billing-api` and `billing-web`.
- Ecommerce checkout fix: build/test/deploy `ecommerce-api` and `ecommerce-web`.
- CXSync maintenance work: build/test/deploy only CXSync containers.
- Shared Platform API contract change: run wider checks and deploy affected dependents in order.

## Current Codebase Transition

The current live backend still has `apps/server` as the active server. Treat it as a temporary combined backend, not as the target architecture.

Extraction order:

1. Platform API first.
2. Billing second.
3. Ecommerce, CRM, Sites, and CXSync after their contracts are stable.

Until the split is implemented, agents must:

- Keep new code inside clear module boundaries.
- Avoid direct cross-module table writes.
- Write service contracts as if the module may become its own backend service.
- Keep migrations grouped by owning app prefix.
- Avoid importing Billing internals from Ecommerce, CRM, Sites, or CXSync.
- Avoid adding new unrelated domains into the old combined server shape when they belong to a future service.
