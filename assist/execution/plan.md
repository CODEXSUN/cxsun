# Service Split Plan

**Date:** 2026-06-25
**Batch:** #130
**Focus:** Keep one repo for development while extracting independently deployable backend services.
**Version rule:** Use the current `1.0.130` changelog entry for progress. Version bump only on explicit command.

## Current State

Platform API is complete for the current foundation row. It owns its local runtime/core/infrastructure, native foundation modules, MariaDB-backed contract/e2e coverage, frontend wiring for platform-owned clients, and a separate Docker/runtime mode.

Billing API now exists as `apps/billing-api` and owns the current billing route families. Billing API no longer imports `apps/server/src` or `@cxsun/server`; reusable backend runtime code now lives in `packages/platform` and Billing depends on `@cxsun/platform`. Ecommerce API has started as `apps/ecommerce-api`, but Billing go-live readiness takes priority before further Ecommerce migration.

## Target State

The monorepo remains the development source of truth, but each backend service can deploy independently.

Platform API owns:

- auth and session validation
- tenant resolution and tenant domains
- admin users and tenant user-management contracts
- RBAC and policy checks
- company and accounting year context contracts
- tenant app registry and enablement
- service tokens for backend-to-backend calls
- audit events
- notifications
- mail delivery contracts
- file/media metadata contracts
- platform event/outbox foundation

Platform API must not own Billing, Ecommerce, CRM, Sites, or CXSync business records.

Billing API owns:

- sales, quotation, export sales, purchase, receipt, and payment entries
- billing-linked accounts contracts
- billing-linked stock documents and ledger reads
- billing document/PDF/mail handoff endpoints

Billing API must not own tenant registry, domains, platform users, RBAC policy catalog, app enablement, audit, notifications, or shared file metadata.

## Implementation Order

1. Keep Platform API green while other services are extracted.
   - Run contract/e2e tests when platform-owned auth, tenant, RBAC, app enablement, mail, files, queue, or audit behavior changes.
   - Do not add business records to Platform API.

2. Prove Billing API as a standalone service.
   - Keep the first row compatibility-mounted from `apps/server`.
   - Route frontend billing/accounting clients through `VITE_BILLING_API_BASE_URL`.
   - Run MariaDB-backed contract/e2e tests.
   - Keep combined backend routes until the live Billing API path is stable.

3. Native-migrate Billing API modules one at a time.
   - Start with the lowest-risk module.
   - Move code into `apps/billing-api/src/modules/<module>` with local docs and tests.
   - Preserve existing route contracts unless a planned migration says otherwise.

4. Keep Billing API zero-server-dependency as a hard rule.
   - `apps/billing-api` may depend on `@cxsun/platform` for reusable framework/runtime/services.
   - `apps/billing-api` must not import `apps/server/src` or `@cxsun/server`.
   - Run `rg "server/src|@cxsun/server" apps/billing-api -n` before closing Billing work.

5. Continue service extraction after Billing API.
   - Ecommerce API, CRM API, Sites API, and CXSync service should depend on Platform API contracts, not Platform API internals.
   - Each service owns its own schema group and deployment container.

6. Expand tests with each module.
   - Contract tests for route availability, guards, and stable response shape.
   - E2E tests for real HTTP + MariaDB flows with isolated cleanup.
   - No in-memory database tests for service behavior.

## Documentation Rules

Every meaningful implementation stage must update:

- local module docs under `apps/platform-api/src/modules/<module>/<module>.module.md`
- local Billing API docs under `apps/billing-api` or `apps/billing-api/src/modules/<module>` when billing behavior changes
- central developer/client docs when the change is visible outside the module
- `assist/documentation/CHANGELOG.md` under the current version

Do not leave docs for a later cleanup pass.

## Verification Gate

Before closing a service extraction stage, run the relevant service checks plus frontend/docs when touched.

```bash
npm run check:docs-progress
npm run typecheck:platform-api
npm run build:platform-api
npm -w apps/platform-api run test:contract
npm -w apps/platform-api run test:e2e
npm run typecheck:billing-api
npm run build:billing-api
npm -w @cxsun/platform run typecheck
npm -w @cxsun/platform run build
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:e2e
npm -w apps/frontend run typecheck
npm -w apps/frontend run build
npm -w apps/docs run build
```

If a command cannot be run, record the reason in the final response and in the relevant task note.

## Next Best Move

Start Billing live smoke preparation: run the Billing API service against local MariaDB on `6205`, point the frontend to `VITE_BILLING_API_BASE_URL=http://localhost:6205`, and manually smoke Sales, Purchase, Receipt/Payment settlement, Accounts reports, Purchase Receipt, Delivery Note, and Stock Ledger before moving to the next business service.

## Billing Deployment Boundary

The first product-level split deployment lives under `.container/billing`.

It contains three independently buildable services:

1. Platform API.
2. Billing API.
3. The current shared frontend compiled as the Billing frontend with Platform and Billing as its only startup dependencies.

MariaDB, Redis, the shared Docker network, and media storage remain external infrastructure. A Billing API-only fix can rebuild and restart only `billing-api`. Platform contract changes deploy Platform API first, followed by affected dependents. Ecommerce will receive the same product-level deployment pattern later with Platform API, Ecommerce API, and its storefront.
