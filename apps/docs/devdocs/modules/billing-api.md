---
title: Billing API
---

# Billing API

Billing API is the standalone backend service for tenant billing and accounting workflows.

## Current Service Boundary

- Workspace: `apps/billing-api`
- Default port: `6205`
- Health check: `GET /health`
- Local command: `npm run dev:billing-api`
- Frontend base URL: `VITE_BILLING_API_BASE_URL`
- Container mode: `CXSUN_RUNTIME_MODE=billing-api`

Billing API now mounts the current billing route families from native `apps/billing-api/src/modules` folders. The old combined-server billing route implementations have been removed. Shared framework and helper dependencies may still point at the transition backend until a future shared-runtime consolidation, and `apps/server` keeps only billing migration bridge exports for tenant database provisioning. This does not block Billing API route ownership or standalone deployment.

## Phase Plan

### Phase 1 - Standalone Boundary

Complete.

- Billing API runs as a separate backend service.
- Frontend billing/accounting clients can use `VITE_BILLING_API_BASE_URL`.
- Docker Compose has a dedicated Billing API service.
- MariaDB-backed contract and e2e tests cover health, route registration, and protected route behavior.

### Phase 2 - Native Module Extraction

Complete for the currently mounted Billing API route families.

- Keep route contracts unchanged while deeper module tests are added.
- Keep shared framework, auth, tenant, mail, document, PDF, and entry-helper dependencies transitional until the shared runtime consolidation is planned separately.

Current native modules:

- Sales Entry
- Quotation Entry
- Receipt Entry
- Payment Entry
- Purchase Entry
- Export Sales Entry
- Accounts and Billing Reports
- Purchase Receipt
- Delivery Note
- Stock Ledger

Billing report endpoints now covered by Billing API route contracts:

- Day Book
- Trial Balance
- Profit and Loss
- Balance Sheet
- Cash Book
- Bank Book
- Period Locks

## Owns

- Sales, quotation, export sales, purchase, receipt, and payment entries
- Accounts ledgers, vouchers, books, and billing-linked reports
- Billing-linked stock documents such as purchase receipts, delivery notes, and stock ledger reads
- Billing document, PDF, print, and mail handoff endpoints

## Does Not Own

- Tenant registry or tenant domains
- Platform users, sessions, RBAC policy registry, and app enablement
- Shared audit, notification, mail contract, or file metadata foundations
- Ecommerce, CRM, Sites, CXSync, TConnect, Frappe, or Tally workflows

Those shared concerns belong to Platform API or their owning product service.

## Frontend Connection

Billing/accounting frontend clients call `billingApiBaseUrl`.

Set `VITE_BILLING_API_BASE_URL=http://localhost:6205` for local standalone Billing API development. If the variable is not set, clients fall back to `VITE_API_BASE_URL` during the transition.

Currently routed clients:

- Sales
- Purchase
- Quotation
- Export Sales
- Receipt
- Payment
- Accounts
- Purchase Receipt
- Delivery Note
- Stock Ledger

## Verification

Billing API tests use MariaDB and real HTTP routes.

```bash
npm run typecheck:billing-api
npm run build:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
npm -w apps/billing-api run test:mutations
npm -w apps/frontend run typecheck
npm -w apps/frontend run build
```

The module test entrypoints cover sales, quotation, export sales, purchase, receipt, payment, accounts, purchase receipt, delivery note, and stock ledger route protection. The mutation e2e suite creates a disposable tenant database and verifies create/update/get/list paths for Sales, Quotation, Export Sales, Purchase, Purchase Receipt, Delivery Note, and Stock Ledger. It also verifies Receipt and Payment settlement allocations against posted source documents and confirms over-allocation is rejected.
