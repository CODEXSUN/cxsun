# Tirupur Connect Boundary Implementation Plan

**Prepared:** 2026-06-18  
**Status:** Central backend and `apps/b2b-connect-admin` workspace implemented on 2026-06-18; legacy data migration and connector cutover remain controlled follow-up work. This plan is retained as historical migration guidance where it does not conflict with `assist/context/tirupur-connect-boundary.md` or `assist/context/one-repo-multi-backend.md`.

## Current-State Findings

The current `apps/server/src/modules/tconnect` module combines both systems:

- Connector-capable pieces already exist: tenant-side supplier/product source records, publication state, source tenant identifiers, and publish commands.
- Marketplace pieces also exist in the same module: public supplier/product/RFQ reads, buyers, RFQs, memberships, verification concepts, review queues, events, news, messages, and analytics-oriented tables.
- Marketplace ownership currently depends on a special tenant slug, `tconnect`.
- The migration actively removes marketplace tables from non-marketplace tenant databases.
- `apps/b2b-connect` exists as the Tirupur Connect public/member application.
- `apps/b2b-connect-admin` and `apps/server/src/modules/tirupur-connect` now exist; treat any older "create this workspace/module" wording below as completed historical planning unless current code inspection proves a gap.

## Target Layout

```text
apps/
  b2b-connect/            public website and buyer/supplier member portal
  b2b-connect-admin/      marketplace staff back office
  frontend/               billing/ERP UI containing the TConnect connector
  server/
    src/modules/
      tconnect/           billing connector only
      tirupur-connect/    central marketplace engine
```

## Safe Work Order

### Phase 0 - Freeze the Boundary

- Treat `assist/context/tirupur-connect-boundary.md` as canonical.
- Do not add new marketplace features to `modules/tconnect`.
- Inventory existing `tc_*` tables, routes, repositories, and frontend calls before moving code.
- Capture database counts and representative records before any migration.

### Phase 1 - Central Marketplace Foundation

- Maintain `apps/server/src/modules/tirupur-connect` with domain, application, infrastructure, and HTTP interface boundaries while the combined server remains the transition backend.
- Add central marketplace persistence in the platform/master database or a dedicated marketplace database connection.
- Do not resolve marketplace-owned APIs through `TenantContextService`.
- Introduce normalized company/product provenance with `billing_connector` and `web` source types.
- Add marketplace identities, roles, sessions, and signed billing SSO exchange.

### Phase 2 - Immutable Submission Contract

- Define signed `/api/v1/tirupur-connect/sync/*` contracts.
- Add connector submission, submission item, revision, idempotency key, sync version, and review status records.
- Make approved public records immutable snapshots.
- Make connector updates create reviewable revisions.
- Add replay protection, request signing, audit logs, and retry-safe idempotency.

### Phase 3 - Separate Existing TConnect Code

- Keep tenant-side source selection, publication commands, sync state, and opportunity import under `modules/tconnect`.
- Move public reads, buyer accounts, RFQs, quotations, inquiries, memberships, verification, moderation, events, jobs, news, ads, and analytics to `modules/tirupur-connect`.
- Remove marketplace-mode branching such as `isMarketplaceTenant` only after compatibility APIs and data migration are verified.
- Stop creating or dropping marketplace-owned tables during tenant provisioning.

### Phase 4 - Applications and Administration

- Connect `apps/b2b-connect` to Tirupur Connect public/member APIs.
- Maintain `apps/b2b-connect-admin` for marketplace staff.
- Implement review queues for connected-client submissions and web-only registrations.
- Keep marketplace admin authentication separate from billing tenant dashboard authentication.

### Phase 5 - Data Migration

- Map current central-tenant `tc_*` records into the new marketplace schema.
- Preserve source tenant IDs, source UUIDs, public UUIDs/slugs where safe, review history, and publication timestamps.
- Reconcile duplicate companies/products before cutover.
- Run read-only comparison reports between old and new public APIs.
- Switch routes through compatibility adapters, then retire old central-tenant ownership.

### Phase 6 - Marketplace Features

- Web-only supplier onboarding.
- Buyer RFQs and supplier quotations.
- Verification and membership/payment workflows.
- Advertisements, events, jobs, articles/news, complaints, moderation, and analytics.
- Opportunity import into connected billing tenants without transferring accounting ownership to the marketplace.

## First Implementation Slice

1. Create the `tirupur-connect` module skeleton and central database registration.
2. Define marketplace company, source provenance, connector submission, and submission revision types/tables.
3. Add signed, idempotent sync intake without publishing anything publicly.
4. Adapt one existing TConnect supplier publication command to submit through that contract.
5. Add an admin read-only submission queue.
6. Verify that an existing billing tenant still operates when Tirupur Connect is unavailable; failed sync remains retryable.

## Acceptance Gates

- Tirupur Connect starts and serves its own health/public endpoint without a billing tenant header.
- TConnect tenant APIs cannot create marketplace-owned RFQs, memberships, or verification decisions.
- A billing record update creates a new revision and leaves the approved public snapshot unchanged.
- Web-only supplier records require no billing tenant or billing master record.
- Signed sync rejects replayed or tampered requests.
- Existing central marketplace data has a documented, count-verified migration path before old tables are retired.
- Public/member/admin/sync route families enforce separate authorization policies.

## Implementation Result - 2026-06-18

Completed:

- Central platform/master MariaDB schema with 18 `tc_*` tables.
- Seeded 17 Tirupur textile categories and Free/Silver/Gold/Platinum plans.
- Marketplace registration, login, member JWT, and role-aware guards.
- Public directory, product, RFQ, event, job, article, advertisement, plan, and inquiry APIs.
- Member company, product, RFQ, quotation, verification, membership, and Razorpay payment APIs.
- Admin dashboards, connector review, company/RFQ/inquiry moderation, verification decisions, content management, plan management, and audit APIs.
- Signed timestamp-bounded idempotent connector submissions with immutable revisions.
- Real server smoke test proving the public status endpoint works without tenant context.

Verification:

- Server typecheck passed.
- Server build passed.
- Tirupur Connect contract test passed.
- Master migration completed and central tables/seeds were verified directly.
- The full migration command later timed out while provisioning the unrelated `aaran_associates` tenant; the Tirupur Connect master migration had already completed successfully.

Still separate:

- Legacy tenant 115 data migration.
- Adapting the existing TConnect publish command to call the signed sync endpoint.
- Building `apps/b2b-connect-admin`.
- Wiring the public/member app to these APIs.
