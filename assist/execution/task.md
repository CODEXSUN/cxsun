# Tasks

## 2026-06-25 - Contact and address follow-up

**Batch:** #131
**Owner:** Billing API, Contact frontend

### Completed

- [x] Make Pincode independent from Country, State, District, and City.
- [x] Persist selected and inline-created Pincode IDs on Contact addresses.
- [x] Preserve Country -> State -> District -> City parent IDs during inline creation.
- [x] Reorder Contact list columns and simplify Contact row display.
- [x] Add tenant-aware next Contact code preview and save fallback.
- [x] Refine Contact details and address form layouts.
- [x] Remove changing text from global startup loaders.
- [x] Add Billing API mutation e2e coverage that creates Country, State, District, City, Pincode, and Contact, then reloads the Contact and verifies every saved address reference.
- [x] Make Contact code allocation concurrency-safe with a tenant-database sequence and transaction row lock.
- [x] Add focused protected-route coverage for `GET /api/v1/contacts/next-code`.
- [x] Verify simultaneous Contact creates allocate distinct sequential codes in MariaDB mutation e2e.

### Next Missing Work

- [ ] Seed or create a disposable tenant login and run an authenticated browser smoke for Contact create/edit, inline location creation, Pincode persistence, list layout, and the text-free loader.
- [ ] Decide whether to implement the existing Contact GST-details collection UI next; its data types and persistence exist but the upsert form does not expose it.
- [ ] Plan merge/deduplication, CSV import/export, independent ledger selection, and contact grouping as separate product slices now that the Contact save path has dedicated automated coverage.

## 2026-06-25 - Service split completion path

**Batch:** #130
**Owner:** Platform API, Billing API
**Rule:** Update docs and changelog at every meaningful stage. Do not bump version unless explicitly commanded.

### Done In Current Platform API Slice

- [x] Create `apps/platform-api` as the shared foundation backend service.
- [x] Add Platform API runtime, preflight, root scripts, env samples, and service docs.
- [x] Add event primitives and sync tags.
- [x] Add native Health module.
- [x] Add native Auth module.
- [x] Add native Tenant module.
- [x] Add native Tenant Domain module.
- [x] Add native Industry module.
- [x] Add MariaDB-backed contract test suite.
- [x] Add MariaDB-backed e2e test suite with isolated cleanup.
- [x] Add documentation/changelog progress guard.
- [x] Add frontend Platform API base URL and route platform-owned frontend clients to Platform API with combined-backend fallback.

### Next Implementation Tasks

- [x] Extract shared backend framework/runtime from `apps/server/src/core` into a clean Platform-owned runtime boundary.
- [x] Extract shared infrastructure adapters used by Platform API: database connection, auth JWT/password helpers, tenant database connector, queue service, and config.
- [x] Make Platform API source and tests stop depending on `apps/server` imports.
- [x] Decide and document temporary allowed imports from `apps/server/src/core` and `apps/server/src/infrastructure`: none are allowed inside Platform API.
- [x] Implement native RBAC module for platform policies, tenant policy toggles, and role-policy checks.
- [x] Implement native Company and Accounting Year platform contracts.
- [x] Implement native App Registry and tenant app enablement module.
- [x] Implement service-token authentication for future Billing, Ecommerce, CRM, Sites, and CXSync service calls.
- [x] Implement audit event writer and read contracts.
- [x] Implement notification contract foundation.
- [x] Implement mail contract foundation without moving tenant business mail internals into Platform API.
- [x] Implement file/media metadata contract foundation.
- [x] Add durable outbox/queue processing for cross-service platform events where needed.
- [x] Add OpenAPI or equivalent route contract documentation for stable service consumers.
- [x] Add Docker/container entry for Platform API as a separately deployable backend.
- [x] Add deployment notes for Platform API port, env, health check, and dependency order.

### Required Test Expansion

- [ ] Keep `npm -w apps/platform-api run test:contract` green after each module change.
- [ ] Keep `npm -w apps/platform-api run test:e2e` green after route/auth/module changes.
- [x] Add RBAC e2e coverage when RBAC module is implemented.
- [x] Add service-token contract/e2e coverage when service tokens are implemented.
- [x] Add company/accounting-year e2e coverage when those contracts are implemented.
- [x] Add app-registry e2e coverage when app enablement is implemented.
- [x] Add audit/notification/mail/files focused contract tests as each module lands.
- [ ] Run `npm run check:docs-progress` before final response on every meaningful change.

### Verification Commands

```bash
npm run check:docs-progress
npm run typecheck:platform-api
npm run build:platform-api
npm -w apps/platform-api run test:contract
npm -w apps/platform-api run test:e2e
npm -w apps/docs run build
```

### Not In This Slice

- [ ] Do not start Billing API until Platform API service contracts are stable.
- [ ] Do not move Ecommerce, CRM, Sites, or CXSync business tables into Platform API.
- [ ] Do not provision tenant business app schemas from Platform API except approved `core_*` platform tables.
- [ ] Do not bump version without explicit user command.

### Server Cleanup Safety Result

- [x] Checked old `apps/server/src/core` platform folders for safe deletion.
- [x] Kept them in place because the combined backend and business modules still import tenant context, tenant repositories, tenant-domain resolution, industry, and health modules until Billing API and other business services are extracted.
- [x] Removed Platform API's unused package dependency on `@cxsun/server` / `@cxsun/shared` instead.

## 2026-06-25 - Billing API first extraction row

**Batch:** #130
**Owner:** Billing API
**Rule:** Keep behavior safe first. Native module cleanup can happen after the standalone service and frontend route are proven.

### Done In Current Billing API Slice

- [x] Created `apps/billing-api` as a separately runnable backend service.
- [x] Kept `apps/server` intact and mounted proven billing/accounting modules from the compatibility backend to avoid behavior loss.
- [x] Added Billing API runtime, preflight, root scripts, env samples, and app-local docs.
- [x] Added Docker Compose service and container entrypoint mode for `CXSUN_RUNTIME_MODE=billing-api`.
- [x] Routed frontend sales, purchase, quotation, export sales, receipt, payment, accounts, purchase receipt, delivery note, and stock ledger clients through `VITE_BILLING_API_BASE_URL`.
- [x] Added MariaDB-backed Billing API contract and e2e tests.
- [x] Added per-module billing test entrypoints for sales, quotation, export sales, purchase, receipt, payment, accounts, purchase receipt, delivery note, and stock ledger.
- [x] Added central developer docs for Billing API.

### Required Billing API Verification

- [x] `npm -w @cxsun/platform run typecheck`
- [x] `npm -w @cxsun/platform run build`
- [x] `npm run typecheck:billing-api`
- [x] `npm run build:billing-api`
- [x] `npm -w apps/billing-api run test:contract`
- [x] `npm -w apps/billing-api run test:modules`
- [x] `npm -w apps/billing-api run test:e2e`
- [x] `npm -w apps/billing-api run test:mutations`
- [x] `npm -w apps/frontend run typecheck`
- [x] `npm -w apps/frontend run build`
- [x] `npm -w apps/server run typecheck`
- [x] `npm -w apps/server run build`
- [x] `npm -w apps/docs run build`
- [x] `npm run check:docs-progress`
- [x] `rg "server/src|@cxsun/server" apps/billing-api -n` returns no matches.

### Next Safe Move After This Row

- [x] Start Phase 2 by moving Receipt Entry into native `apps/billing-api/src/modules/entries/receipt`.
- [x] Continue Phase 2 by moving Payment Entry into native `apps/billing-api/src/modules/entries/payment`.
- [x] Continue Phase 2 by moving Purchase Entry into native `apps/billing-api/src/modules/entries/purchase`.
- [x] Continue Phase 2 by moving Export Sales Entry into native `apps/billing-api/src/modules/entries/export-sales`.
- [x] Move Accounts and Billing Reports into native `apps/billing-api/src/modules/accounts`.
- [x] Expand Billing API route tests to include accounts reports, cash/bank books, and period locks.
- [x] Rewire native Receipt, Payment, and Purchase modules to use native Billing API Accounts posting providers.
- [x] Move Sales Entry into native `apps/billing-api/src/modules/entries/sales`.
- [x] Move Quotation Entry into native `apps/billing-api/src/modules/entries/quotation`.
- [x] Extract shared reusable backend runtime into `packages/platform`.
- [x] Rewire Billing API away from all `apps/server/src` and `@cxsun/server` imports.
- [x] Include Platform package, Platform API, and Billing API in active build/typecheck paths.
- [x] Move Purchase Receipt into native `apps/billing-api/src/modules/stock/inward/purchase-receipt`.
- [x] Move Delivery Note into native `apps/billing-api/src/modules/stock/outward/delivery-note`.
- [x] Move Stock Ledger into native `apps/billing-api/src/modules/stock/ledger`.
- [x] Remove Billing API module mounts for sales, quotation, purchase receipt, delivery note, and stock ledger from compatibility server imports.
- [x] Route purchase receipt, delivery note, and stock ledger frontend clients to Billing API.
- [x] Add deeper Billing API mutation e2e coverage for create/update/get/list flows against a disposable MariaDB tenant database.
- [x] Remove old combined-server billing route implementations after Billing API native route ownership is proven.
- [x] Keep only server-side billing migration bridge exports required by tenant database provisioning.
- [x] Add focused allocation mutation e2e for Receipt and Payment settlement flows.
- [x] Finalize Billing API go-live row with no remaining Billing API route ownership blockers.

### Future Shared Runtime Work

The remaining shared framework/helper dependencies are deferred to the platform shared-runtime consolidation. They are not Billing API route ownership blockers because Billing API now owns the mounted billing modules, frontend traffic path, Docker runtime, MariaDB e2e coverage, mutation coverage, and old combined-server billing route cleanup.

## 2026-06-25 - Independent Billing deployment

**Batch:** #131
**Owner:** Platform API, Billing API, Billing frontend
**Rule:** Package Billing first. Ecommerce and later products receive their own deployment units in later tasks.

- [x] Add an isolated `.container/billing` Compose project.
- [x] Add independent Platform API, Billing API, and Billing frontend Docker images.
- [x] Keep MariaDB, Redis, Docker network, and media storage external to the Billing deployment.
- [x] Add health-gated dependency order and per-service redeploy commands.
- [x] Compile the current shared frontend with only Platform and Billing readiness requirements.
- [x] Validate Compose interpolation/configuration.
- [x] Build/typecheck Platform API, Billing API, and frontend.
- [x] Build all three Billing deployment Docker images and verify API runtime imports.
- [x] Run documentation progress checks.

### 2026-06-26 Local Billing stack follow-up

- [x] Add `billing-stack.sh` for local Docker setup and verification.
- [x] Add local env sample with frontend on `6011`, Platform API on `6105`, and Billing API on `6205`.
- [x] Reuse/start existing MariaDB and Redis containers without invoking the old full `.container/setup-local.sh`.
- [x] Verify Platform API, Billing API, and Billing frontend containers are healthy locally.
- [x] Fix fresh Billing API Docker build failure caused by test-only `unknown` address typing.

## 2026-06-25 - Ecommerce API first extraction row

**Batch:** #130
**Owner:** Ecommerce API
**Rule:** Prove the standalone service path before moving or deleting combined-server ecommerce code.

### Done In Current Ecommerce API Slice

- [x] Created `apps/ecommerce-api` as a separately runnable backend service.
- [x] Mounted the proven combined-server ecommerce module first to avoid behavior loss.
- [x] Added Ecommerce API runtime, preflight, root scripts, env samples, and app-local docs.
- [x] Added Docker Compose service and container entrypoint mode for `CXSUN_RUNTIME_MODE=ecommerce-api`.
- [x] Routed frontend ecommerce workspace/settings/product/customer clients through `VITE_ECOMMERCE_API_BASE_URL`.
- [x] Added MariaDB-backed Ecommerce API contract and e2e route-protection tests.
- [x] Added central developer docs for Ecommerce API.

### Required Ecommerce API Verification

- [x] `npm run typecheck:ecommerce-api`
- [x] `npm run build:ecommerce-api`
- [x] `npm -w apps/ecommerce-api run test:contract`
- [x] `npm -w apps/ecommerce-api run test:e2e`
- [x] `npm -w apps/frontend run typecheck`
- [x] `npm -w apps/frontend run build`
- [x] `npm -w apps/docs run build`
- [x] `docker compose -f .container/docker-compose.yml config`
- [x] `npm run check:docs-progress`

### Next Safe Move After This Row

- [ ] Native-move Ecommerce module into `apps/ecommerce-api/src/modules/ecommerce`.
- [ ] Add a mutation e2e that provisions a disposable tenant database and verifies settings/product publication/customer profile create/update flows.
- [ ] Only remove combined-server ecommerce route implementation after standalone Ecommerce API traffic is proven.
