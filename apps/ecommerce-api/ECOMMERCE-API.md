# Ecommerce API

Ecommerce API is the standalone backend boundary for tenant ecommerce workflows.

## Owns

- Store settings
- Product publications over existing Product master records
- Customer ecommerce profiles over existing Contact master records
- Carts, ecommerce orders, shipments, returns, coupons, reviews, wishlists, and portal account records
- Ecommerce-to-Billing invoice handoff contracts when that workflow is implemented

## Does Not Own

- Tenant registry, domains, platform users, RBAC policy registry, app enablement, audit, notifications, shared mail contracts, or file metadata. Those belong to Platform API.
- Billing invoices, vouchers, posting, stock ledger ownership, CRM pipelines, Sites content, CXSync maintenance, TConnect, Frappe, or Tally workflows.

## Transition Rule

This service starts by mounting the proven ecommerce module from the compatibility backend. Do not delete the combined-server ecommerce route implementation until frontend traffic and standalone Ecommerce API tests are proven.

## Phase Status

### Phase 1 - Standalone Boundary

Started. Ecommerce API runs separately, frontend ecommerce clients can use `VITE_ECOMMERCE_API_BASE_URL`, and MariaDB-backed contract/e2e tests cover health, route registration, and protected route behavior.

### Phase 2 - Native Module Extraction

Not started. Move ecommerce code into `apps/ecommerce-api/src/modules` only after the standalone route and frontend path stay green.

## Runtime

- Local service command: `npm run dev:ecommerce-api`
- Default port: `6305`
- Health check: `GET /health`
- Frontend env: `VITE_ECOMMERCE_API_BASE_URL=http://localhost:6305`
- Container mode: `CXSUN_RUNTIME_MODE=ecommerce-api`

## Test Suite

Ecommerce API tests use MariaDB and real HTTP routes. Do not replace them with in-memory behavior tests.

```bash
npm run typecheck:ecommerce-api
npm run build:ecommerce-api
npm -w apps/ecommerce-api run test:contract
npm -w apps/ecommerce-api run test:e2e
```

Frontend ecommerce clients route workspace, settings, product publication, and customer profile calls through `ecommerceApiBaseUrl`.
