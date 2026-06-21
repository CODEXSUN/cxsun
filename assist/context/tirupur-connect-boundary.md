# TConnect and Tirupur Connect Boundary

**Decision date:** 2026-06-18  
**Status:** Canonical architecture decision

## Core Rule

> TConnect connects billing clients to the marketplace. Tirupur Connect owns and operates the marketplace.

These are separate bounded systems even though they live in the same monorepo and communicate through the same server runtime.

## System Ownership

### TConnect Connector

TConnect lives inside the existing billing/ERP application.

It may:

- Let an authorized billing tenant select company, product, capacity, certificate, and offer records for publication.
- Create immutable publication submissions and later revisions.
- Send signed synchronization requests to Tirupur Connect.
- Receive RFQs or marketplace opportunities that a tenant may import into its own quotation or sales-order workflow.
- Store source identifiers, synchronization state, submission state, and the last accepted marketplace reference.

It must not:

- Own the public marketplace, buyer accounts, memberships, verification decisions, public RFQs, advertisements, events, jobs, news, or marketplace analytics.
- Treat one billing tenant as the marketplace database.
- Copy billing passwords or expose tenant database credentials to Tirupur Connect.
- Silently overwrite an approved marketplace record after a billing record changes.

Backend boundary:

```text
apps/server/src/modules/tconnect/
```

Frontend boundary:

```text
apps/frontend/src/features/tconnect/
```

API boundary:

```text
/api/v1/tconnect/*
```

### Tirupur Connect Platform

Tirupur Connect is a standalone central product that operates without any billing tenant.

It owns:

- Public website and searchable company/product directory.
- Central marketplace database and normalized marketplace records.
- Buyer accounts and web-only supplier accounts.
- RFQs, quotations, inquiries, leads, and marketplace opportunity history.
- Membership plans, payments, verification, moderation, and publication decisions.
- Advertisements, events, jobs, articles/news, reports, and marketplace analytics.
- Dedicated marketplace staff and back-office administration.

Application boundaries:

```text
apps/b2b-connect/          public and member Tirupur Connect product
apps/b2b-connect-admin/    dedicated marketplace back office
```

Backend boundary:

```text
apps/server/src/modules/tirupur-connect/
```

Database boundary:

```text
tirupur_connect_db
```

Tirupur Connect tables must not be created in `cxsun_master` or a tenant database. The product database uses the shared MariaDB server credentials by default, with optional `TIRUPUR_CONNECT_DB_*` overrides.

API boundaries:

```text
/api/v1/tirupur-connect/public/*
/api/v1/tirupur-connect/member/*
/api/v1/tirupur-connect/admin/*
/api/v1/tirupur-connect/sync/*
```

Do not place marketplace ownership back under `tconnect`, even when the two modules use internal service contracts.

## Supplier Sources

Tirupur Connect accepts two sources that normalize into one marketplace company model.

### Connected Billing Client

```text
billing tenant
  -> TConnect connector
  -> immutable submission/revision
  -> Tirupur Connect review queue
  -> admin decision
  -> approved marketplace company/product
```

Required provenance:

- `source_type = billing_connector`
- Source tenant ID.
- External record UUID.
- Submission/revision ID.
- Last synchronized time.
- Publication state.
- Sync version.

The billing tenant remains the source of its company, product, capacity, and certificate data. Tirupur Connect owns the reviewed marketplace representation.

### Web-Only Member

```text
Tirupur Connect registration
  -> company onboarding
  -> profile and product creation
  -> verification
  -> admin decision
  -> approved marketplace company/product
```

Required provenance:

- `source_type = web`
- Marketplace account ID.
- Marketplace company ID.
- Created/updated actor.
- Verification state.
- Publication state.

Tirupur Connect directly owns these records.

## Identity and Access

Tirupur Connect uses a central identity boundary for buyers, web-only suppliers, marketplace staff, and association representatives.

Billing users may enter through signed SSO issued by CXSun/TConnect. Password hashes and billing credentials must never be copied into the marketplace.

`apps/b2b-connect-admin` is restricted to marketplace staff and approved super-admin roles. It is not the existing billing tenant admin desk.

## Data Ownership

| Data | Owner |
|---|---|
| Billing company/customer master | Billing tenant |
| Connector selection and publication request | TConnect |
| Connector submission/revision history | TConnect and sync contract |
| Approved normalized marketplace company | Tirupur Connect |
| Web-only company and products | Tirupur Connect |
| Public catalog | Tirupur Connect |
| Buyer RFQ and supplier quotation | Tirupur Connect |
| Membership and marketplace payment | Tirupur Connect |
| Verification/publication decision | Tirupur Connect Admin |
| Imported quotation, sales order, invoice, and accounting | Billing tenant |

When a marketplace opportunity becomes an order, Tirupur Connect retains the opportunity and conversion reference. The connected billing tenant owns the accounting document it creates.

## Publication Workflow

Use an immutable submission model:

```text
Draft
  -> Submitted
  -> Under review
  -> Changes requested
  -> Approved
  -> Published
  -> Suspended
  -> Archived
```

An approved public record is a reviewed snapshot. A later connector change creates a new revision for review. Synchronization must never mutate the approved public snapshot silently.

## Compatibility and Migration Rule

The current `apps/server/src/modules/tconnect` implementation mixes connector and marketplace responsibilities. Do not expand that mixed model.

- Preserve useful client-side source/profile selection and publication code as connector behavior.
- Move central marketplace records, public APIs, buyer/RFQ/membership/verification features, and review administration into `modules/tirupur-connect`.
- Replace the special `tconnect` tenant as marketplace owner with central marketplace persistence that does not require tenant context.
- Migrate existing data with explicit mapping and verification; do not drop marketplace tables or data as part of the boundary refactor.
- Keep temporary compatibility routes/adapters only when needed for a controlled migration, and mark them deprecated.

If any older document conflicts with this file, this file wins.
