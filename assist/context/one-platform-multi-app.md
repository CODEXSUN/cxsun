# One Platform, Multi-App Architecture

## Decision

CXSun will stay as one repository and one server-managed platform. We will not split owned products, client-specific products, or industry apps into many repositories while the team is small.

The intended shape is:

```text
one monorepo
one backend server API
one shared platform database layer
tenant-isolated business databases
multiple frontend/public apps on separate dev ports and production domains
shared engines and services for common business logic
```

This lets one or two developers manage the whole platform without losing clean boundaries for future team growth.

## App Boundary

Use separate apps or app surfaces when the product experience is different:

| Product/domain | App surface | Purpose |
|----------------|-------------|---------|
| `tirupurdirect.com` | ecommerce storefront | Public ecommerce and order flow |
| `tirupurconnect.com` | B2B Connect public app | B2B connection and marketplace flow |
| `tenkasisports.com` | sports public/app surface | Club, students, fees, events, attendance |
| `neot.in` | learning platform | Courses, learning, fees, student portal |
| `aaran.org` | welfare site/app | Welfare organization, members, donations |
| `horseclub.in` | ecommerce brand app | Branded t-shirt/product storefront |
| `aaranassociates.com` | auditor portal/site | Auditor office, clients, filings, billing |

Use separate local ports during development so features and routes do not become tangled:

```text
6010 main tenant ERP/billing workspace
6020 docs
6030 auditor portal
6031 ecommerce/store operations
6032 B2B Connect/public B2B
6033 sports club
6034 learning platform
6035 welfare organization
6036 CRM
6037 sites/public page manager
6038 blog/brand content
6039 ZETRO
6040 textile lab
6041 garment manufacturing
6042 UPVC manufacturing
```

The exact port numbers can change when a port is already used, but the rule remains: different public products should be independently runnable and domain-mappable.

## Shared Engines

Do not duplicate billing, accounting, mail, CRM, site/blog, payments, files, auth, tenant/company, ZETRO, or GST/compliance logic inside each app.

Shared business capability belongs in engines and services:

```text
engines/accounting
  ledger, voucher, posting, reports, period locks, audit

engines/billing
  sales invoice, purchase bill, receipt, payment, PDF, email, GST document flow

engines/inventory
  item, stock movement, batch/size/color, inward/outward, manufacturing use

engines/document
  numbering, print template, PDF, attachments

engines/compliance
  GST, e-invoice, e-way, filing status, provider operations

engines/communication
  mail, notifications, future WhatsApp

engines/platform
  tenant, app registry, subscription, features, domain mapping, permissions
```

Services coordinate engines across apps:

```text
BillingService
AccountingService
InventoryService
ComplianceService
MailService
DomainAppService
SubscriptionService
```

## Cross-App Transaction Rule

Apps must not write another app's transaction tables directly. Apps request a use case from the core service/engine layer.

Correct examples:

```text
ecommerce order
  -> BillingService.createSalesInvoice()
  -> AccountingService.postVoucher()
  -> InventoryService.reduceOrReserveStock()
  -> MailService.sendInvoice()

auditor service bill
  -> BillingService.createSalesInvoice()
  -> AccountingService.postVoucher()
  -> ComplianceService.linkClientFiling()

sports membership fee
  -> BillingService.createInvoiceOrReceipt()
  -> AccountingService.postVoucher()
  -> MailService.sendReceipt()

learning course fee
  -> BillingService.createInvoiceOrReceipt()
  -> AccountingService.postVoucher()

welfare donation
  -> BillingService.createReceipt()
  -> AccountingService.postVoucher()
```

Wrong examples:

```text
ecommerce directly inserts account vouchers
sports directly edits sales invoice rows
auditor directly mutates billing tables without a billing service command
industry app directly creates ledger postings
```

## Backend Placement

Keep one backend app under `apps/server`, but leave clear space for reusable engines and app modules.

Recommended direction:

```text
apps/server/src/
  core/                 framework, auth guard, tenant resolution, platform primitives
  shared/               backend-only helpers
  infrastructure/       database, queue, provisioning, adapters
  modules/
    foundation/         reusable records and compatibility engines
    engines/            reusable business engines as they become stable
    services/           cross-engine orchestration services
    entries/            billing transaction modules
    accounts/           accounting surface and reports
    ecommerce/          ecommerce app APIs
    tirupur-connect/    central Tirupur Connect marketplace APIs
    tconnect/           billing-to-marketplace connector APIs
    auditor/            auditor office APIs
    sports-club/        sports domain APIs
    learning/           learning platform APIs
    welfare/            welfare organization APIs
    sites/              public site/blog APIs
    crm/                CRM APIs
    zetro/ or agent-os/ Agent OS APIs
    industry/           industry-specific modules such as textile lab, garment, UPVC, offset
```

The current repo may not have every folder yet. Create them only when real work begins.

## Frontend Placement

Private tenant workspace remains under the main frontend shell:

```text
/app/billing
/app/accounts
/app/auditor
/app/crm
/app/sites
/app/blog
/app/zetro
/app/textile-lab
/app/garment
/app/upvc
/app/offset-printing
```

Public or product-specific domains should get separate app surfaces when their UX is different:

```text
apps/docs
apps/frontend          current private tenant/admin/super-admin shell
future apps/ecommerce
future apps/b2b-connect
future apps/sports
future apps/learning
future apps/welfare
future apps/auditor-portal
```

Do not create these future apps until a real product slice needs them. When created, they should share auth/API clients, UI primitives, and domain types through shared packages or documented API contracts.

Initial scaffold workspaces now exist for:

```text
apps/auditor
apps/ecommerce
apps/b2b-connect
apps/b2b-connect-admin
apps/sports
apps/learning
apps/welfare
apps/crm
apps/sites
apps/blog
apps/zetro
apps/textile-lab
apps/garment
apps/upvc
```

These apps use the shared `packages/app-shell` scaffold and should grow by calling the shared server API/core services, not by copying billing/accounting logic.

Tirupur Connect has a stricter internal boundary than the other product examples:

- `apps/b2b-connect` is its public/member app.
- `apps/b2b-connect-admin` is its dedicated marketplace back office.
- `modules/tirupur-connect` owns the central marketplace.
- `modules/tconnect` remains only the connector inside billing tenants.

See `assist/context/tirupur-connect-boundary.md`.

## Team Growth Rule

Because the current team is small, prefer one repo and one server deployment. To stay ready for a future team:

- Keep each app surface in its own folder or feature boundary.
- Keep shared engines free from frontend UI.
- Keep module internals private; expose public service contracts.
- Keep app-specific styling, routing, and copy inside that app.
- Keep billing/accounting/compliance state changes server-owned.
- Use feature flags and app registry records to enable apps per tenant.
- Split into separate repositories only if a product later gets its own team, release cycle, ownership, security boundary, or high independent traffic.

## Summary Rule

```text
Separate app for separate business experience.
Shared engine for shared business logic.
One repo.
One backend core.
Different frontend ports/domains when needed.
```
