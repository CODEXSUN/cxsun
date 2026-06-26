---
title: Ecommerce API
---

# Ecommerce API

Ecommerce API is the standalone backend service for tenant online-selling workflows.

## Current Service Boundary

- Workspace: `apps/ecommerce-api`
- Default port: `6305`
- Health check: `GET /health`
- Local command: `npm run dev:ecommerce-api`
- Frontend base URL: `VITE_ECOMMERCE_API_BASE_URL`
- Container mode: `CXSUN_RUNTIME_MODE=ecommerce-api`

Ecommerce API starts by mounting the current proven ecommerce module from the compatibility backend. Keep the combined-server ecommerce route implementation in place until standalone traffic and tests are proven.

## Phase Plan

### Phase 1 - Standalone Boundary

Started.

- Ecommerce API runs as a separate backend service.
- Frontend ecommerce clients can use `VITE_ECOMMERCE_API_BASE_URL`.
- Docker Compose has a dedicated Ecommerce API service.
- MariaDB-backed contract and e2e tests cover health, route registration, and protected route behavior.

### Phase 2 - Native Module Extraction

Not started.

- Move ecommerce code into `apps/ecommerce-api/src/modules` only after the service route and frontend path stay green.
- Preserve `/api/v1/ecommerce` route contracts unless a planned migration says otherwise.

## Owns

- Store settings
- Ecommerce product publications over Product master records
- Ecommerce customer profiles over Contact master records
- Carts, orders, shipments, returns, coupons, reviews, wishlists, and portal accounts
- Ecommerce-to-Billing invoice request contracts when checkout reaches invoicing

## Does Not Own

- Tenant registry or tenant domains
- Platform users, sessions, RBAC policy registry, and app enablement
- Billing invoices, vouchers, postings, and settlement allocations
- CRM pipelines, Sites content, CXSync maintenance, TConnect, Frappe, or Tally workflows

## Frontend Connection

Ecommerce frontend clients call `ecommerceApiBaseUrl`.

Set `VITE_ECOMMERCE_API_BASE_URL=http://localhost:6305` for local standalone Ecommerce API development. If the variable is not set, clients fall back to `VITE_API_BASE_URL` during the transition.

Currently routed clients:

- Ecommerce workspace
- Store settings
- Product publication upsert
- Customer profile upsert

## Verification

Ecommerce API tests use MariaDB and real HTTP routes.

```bash
npm run typecheck:ecommerce-api
npm run build:ecommerce-api
npm -w apps/ecommerce-api run test:contract
npm -w apps/ecommerce-api run test:e2e
npm -w apps/frontend run typecheck
npm -w apps/frontend run build
```
