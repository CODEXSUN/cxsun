# Billing API

Billing API is the standalone backend boundary for tenant billing and accounting workflows.

## Owns

- Sales, quotation, export sales, purchase, receipt, and payment entries
- Accounts ledgers, vouchers, books, reports, and posting controls
- Billing-linked stock vouchers: purchase receipt, delivery note, and stock ledger reads
- Billing document PDF/tool/mail endpoints

## Does Not Own

- Tenant registry, domains, platform users, RBAC policy registry, app enablement, audit, notifications, shared mail contracts, or file metadata. Those belong to Platform API.
- Ecommerce, CRM, Sites, CXSync, TConnect, Frappe, Tally, and public site workflows.

## Transition Rule

This service now mounts the billing route families from native `apps/billing-api/src/modules` folders. The old combined-server billing route implementations have been removed. `apps/server` keeps only small migration bridge exports for tenant database provisioning until provisioning ownership fully moves to the split services.

## Phase Status

### Phase 1 - Standalone Boundary

Complete. Billing API runs separately, frontend billing clients can use `VITE_BILLING_API_BASE_URL`, Docker has a dedicated service, and MariaDB-backed contract/e2e tests cover route protection.

### Phase 2 - Native Module Extraction

Complete for the currently mounted Billing API route families.

Current native modules:

- Sales Entry: `apps/billing-api/src/modules/entries/sales`
- Quotation Entry: `apps/billing-api/src/modules/entries/quotation`
- Receipt Entry: `apps/billing-api/src/modules/entries/receipt`
- Payment Entry: `apps/billing-api/src/modules/entries/payment`
- Purchase Entry: `apps/billing-api/src/modules/entries/purchase`
- Export Sales Entry: `apps/billing-api/src/modules/entries/export-sales`
- Accounts and Billing Reports: `apps/billing-api/src/modules/accounts`
- Purchase Receipt: `apps/billing-api/src/modules/stock/inward/purchase-receipt`
- Delivery Note: `apps/billing-api/src/modules/stock/outward/delivery-note`
- Stock Ledger: `apps/billing-api/src/modules/stock/ledger`

Shared framework, auth, tenant, mail, document, PDF, and entry-helper services may still come from the compatibility backend during a future shared-runtime consolidation. This is not a Billing API route ownership blocker. Accounts/report posting is native inside Billing API for sales, receipt, payment, and purchase flows. The combined backend no longer mounts Billing API route modules.

## Runtime

- Local service command: `npm run dev:billing-api`
- Default port: `6205`
- Health check: `GET /health`
- Frontend env: `VITE_BILLING_API_BASE_URL=http://localhost:6205`
- Container mode: `CXSUN_RUNTIME_MODE=billing-api`

## Test Suite

Billing API tests use MariaDB and real HTTP routes. Do not replace them with in-memory behavior tests.

```bash
npm run typecheck:billing-api
npm run build:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
npm -w apps/billing-api run test:mutations
```

Frontend billing clients now route sales, quotation, export sales, purchase, receipt, payment, accounts, purchase receipt, delivery note, and stock ledger calls through `billingApiBaseUrl`.

The current contract suite verifies that the billing route families are mounted and protected. Module entrypoints exist for sales, quotation, export sales, purchase, receipt, payment, accounts, purchase receipt, delivery note, and stock ledger.

The mutation e2e suite provisions a disposable tenant database through the real tenant setup path, seeds required cash/bank ledgers, then creates and updates Sales, Quotation, Export Sales, Purchase, Purchase Receipt, Delivery Note, and Stock Ledger records through Billing API HTTP routes before dropping the disposable tenant database. It also verifies Receipt and Payment settlement allocations against posted Sales/Purchase documents, including blocked over-allocation attempts.
