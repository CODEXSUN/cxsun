# One Repo, Multiple Backend Services

## Decision

CXSun will stay in one repository for development, but move toward separately deployable backend services and frontend apps.

The goal is to avoid this release problem:

```text
Billing needs a small urgent fix,
but CXSync or another app is mid-development,
so the whole server cannot be safely deployed.
```

The target answer is:

```text
one repo for development
separate build/test/deploy units for each app
shared Platform API contracts
tenant database isolation
no cross-app schema mixing
```

## Target Workspace Shape

Use **Platform API** as the deployable service name for the shared foundation. Use **core** as the internal framework/foundation layer name and tenant table prefix.

The exact folders can change during implementation, but the target shape is:

```text
apps/
  platform-api/
  billing-api/
  ecommerce-api/
  crm-api/
  sites-api/
  cxsync-api/

  billing-web/
  ecommerce-web/
  crm-web/
  sites-web/
  cxsync-web/

packages/
  shared/
  api-contracts/
  database/
  config/
  logger/
  ui/
```

Until those workspaces exist, treat `apps/server` as the temporary combined backend. It is not the final architecture. Keep its modules ready for extraction by respecting module ownership and public contracts.

## Server Transition Rule

The current `apps/server` folder contains everything because the project started as one active backend. From this point forward, new backend planning should treat it as a transition container.

Refactor order:

1. Extract `platform-api` foundation first.
2. Extract `billing-api` next.
3. Keep `apps/server` running as a compatibility backend until Platform API and Billing are stable.
4. Extract Ecommerce, CRM, Sites, and CXSync only after their boundaries are clear.

Dependency direction:

```text
billing-api -> platform-api
ecommerce-api -> platform-api
ecommerce-api -> billing-api for invoice creation
crm-api -> platform-api
sites-api -> platform-api
cxsync-api -> isolated maintenance contracts
```

Platform API must not depend on Billing, Ecommerce, CRM, Sites, or CXSync.

## Platform API

Platform API is the foundation every app can depend on.

Platform API owns:

- tenant resolution and tenant app enablement
- auth, users, sessions, service-to-service tokens
- companies and accounting years
- RBAC and app permissions
- mail delivery and email events
- notifications
- files/media references
- audit logs
- shared settings and app registry

Platform API must stay business-neutral. It should not own invoices, ecommerce orders, CRM leads, or site pages.

## App APIs

Billing API owns:

- domestic sales
- export sales
- quotations/proforma
- receipts and payment allocation
- credit/debit notes
- billing document numbering
- billing PDFs and email handoff
- billing reports and tax summaries

Ecommerce API owns:

- online catalog presentation
- carts
- checkout
- ecommerce orders
- customer order status
- payment gateway checkout handoff
- invoice request to Billing after order confirmation

CRM API owns:

- leads
- pipelines
- follow-ups
- CRM tasks
- contact activity
- notes and reminders

Sites API owns:

- pages
- blog/content
- menus
- SEO metadata
- public publishing state
- domain-bound public content lookup

CXSync API owns:

- tenant database audit
- full-data clone preparation
- mirror flows
- migration rehearsal
- controlled-upgrade evidence

CXSync is not a tenant business app and must not own normal customer billing, ecommerce, CRM, or site records.

## Tenant Database Shape

Each tenant keeps one database. Inside it, table groups are separated by owner prefix.

```text
tenant_aaran
  core_*
  billing_*
  crm_*

tenant_tirupur_direct
  core_*
  billing_*
  ecommerce_*
  sites_*

tenant_sathish
  core_*
  crm_*
```

`core_*` exists for every tenant. App table groups exist according to enabled apps.

This gives clean boundaries without creating many physical databases per tenant too early.

## Integration Pattern

App services should communicate through APIs first and events later.

Initial direct command:

```text
ecommerce-api
  -> POST billing-api /invoices/from-order
  -> billing-api creates invoice and queues PDF/email
  -> ecommerce-api stores returned invoice reference
```

Later event flow:

```text
ecommerce.order.confirmed
  -> billing creates invoice
  -> billing.invoice.created
  -> ecommerce links invoice
```

Never integrate by directly writing another app's tables.

## Migration Path

1. Document service boundaries and module ownership.
2. Prefix tenant tables by owner group where missing or for new tables.
3. Make `core_*` provisioning the default tenant foundation.
4. Extract Platform API startup and shared foundation contracts from current server modules first.
5. Extract Billing API startup from current server modules next.
6. Add Docker image and deploy path for Platform API and Billing.
7. Repeat the same pattern for Ecommerce, CRM, Sites, and CXSync.
8. Add queue/event contracts after direct API contracts are stable.
