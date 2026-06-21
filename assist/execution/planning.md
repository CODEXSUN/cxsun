# Session Plan

**Date:** 2026-06-21
**Focus:** Complete Tirupur Connect marketplace administration workflows.

## Current Admin Slice

1. Replace the generic RFQ status table with a dedicated moderation list and inspection page.
2. Expose a protected RFQ-detail endpoint with buyer context, supplier quotations, attachments, and related inquiries.
3. Keep buyer-owned requirement fields read-only in administration; record lifecycle decisions and review notes through audited status actions.
4. Verify server and B2B admin typechecks/builds plus the marketplace contract.

## Electron Desktop Application

1. Activate the reserved Electron workspace.
2. Package the production frontend for offline UI startup.
3. Keep API access configurable while preserving server-owned business logic.
4. Produce and smoke-test a Windows desktop build.
5. Make the desktop default API host domain-based at `codexsun.local:6005`.
6. Add an Electron runtime smoke check for the domain API base.

## Objective

Implement a tenant-independent Tirupur Connect marketplace backend with central persistence, marketplace identity, public/member/admin/sync APIs, immutable connector submissions, publication review, RFQs, quotations, verification, membership, content, advertising, inquiries, and audit records.

## Current Slice

1. Add central marketplace database tables and seeds.
2. Add marketplace account registration/login and role-aware guards.
3. Add public directory, catalog, RFQ, event, job, article, and inquiry APIs.
4. Add member company/product/RFQ/quote/verification/membership APIs.
5. Add admin dashboard, moderation, review, plans, content, advertisements, and audit APIs.
6. Add signed idempotent connector submission/revision APIs.
7. Register the module and verify server typecheck/build.

## Verification

- `npm -w apps/server run typecheck`
- `npm -w apps/server run build`
- Targeted Tirupur Connect contract tests.

## Sales Manual Invoice Override Fix

1. Keep unique manual Sales invoice numbers exact.
2. Reject duplicate manual numbers instead of silently generating another number.
3. Keep manual overrides from advancing the automatic Sales series.
4. Reconcile numbering to the next available consecutive number so reserved gaps remain usable.
5. Verify server typecheck/build and documentation build.
