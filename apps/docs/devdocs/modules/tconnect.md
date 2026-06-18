---
title: TConnect
---

# TConnect Connector

TConnect is the billing-to-marketplace connector. It is not the Tirupur Connect marketplace.

## Responsibilities

- Select approved billing company, product, capacity, certificate, and offer records for submission.
- Create immutable publication submissions and revisions.
- Synchronize through signed Tirupur Connect sync APIs.
- Track source tenant ID, external UUID, sync version, last sync time, and publication state.
- Import a marketplace opportunity into the tenant's quotation or sales-order workflow when authorized.

## Non-Responsibilities

- Public directory and marketplace database.
- Buyer or web-only supplier accounts.
- Marketplace RFQs and quotations.
- Memberships, payments, verification, moderation, events, jobs, news, advertisements, or marketplace analytics.

Those capabilities belong to `apps/server/src/modules/tirupur-connect` and the `apps/b2b-connect` / `apps/b2b-connect-admin` applications.

See `assist/context/tirupur-connect-boundary.md`.
