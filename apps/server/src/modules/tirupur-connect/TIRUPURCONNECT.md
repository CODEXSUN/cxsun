# Tirupur Connect Backend

Tirupur Connect is the tenant-independent central marketplace. TConnect remains the billing connector.

## Runtime Boundary

- Module: `apps/server/src/modules/tirupur-connect`
- Persistence: dedicated MariaDB database `tirupur_connect_db`
- Public/member app: `apps/b2b-connect`
- Admin app: `apps/b2b-connect-admin`
- Tenant context: not required

## API Families

### Public

```text
GET  /api/v1/tirupur-connect/public/status
POST /api/v1/tirupur-connect/public/register
POST /api/v1/tirupur-connect/public/login
GET  /api/v1/tirupur-connect/public/categories
GET  /api/v1/tirupur-connect/public/companies
GET  /api/v1/tirupur-connect/public/companies/:slugOrUuid
GET  /api/v1/tirupur-connect/public/products
GET  /api/v1/tirupur-connect/public/rfqs
GET  /api/v1/tirupur-connect/public/events
GET  /api/v1/tirupur-connect/public/jobs
GET  /api/v1/tirupur-connect/public/articles
GET  /api/v1/tirupur-connect/public/advertisements
GET  /api/v1/tirupur-connect/public/membership-plans
GET  /api/v1/tirupur-connect/public/frontend-content/:channel
GET  /api/v1/tirupur-connect/public/frontend-pages/:pageKey
POST /api/v1/tirupur-connect/public/inquiries
```

### Member

Marketplace member JWT is issued by the public register/login endpoints.

```text
GET  /api/v1/tirupur-connect/member/me
GET  /api/v1/tirupur-connect/member/company
PUT  /api/v1/tirupur-connect/member/company
POST /api/v1/tirupur-connect/member/company/submit
GET  /api/v1/tirupur-connect/member/products
POST /api/v1/tirupur-connect/member/products
PUT  /api/v1/tirupur-connect/member/products/:uuid
GET  /api/v1/tirupur-connect/member/rfqs
POST /api/v1/tirupur-connect/member/rfqs
PUT  /api/v1/tirupur-connect/member/rfqs/:uuid
POST /api/v1/tirupur-connect/member/rfqs/:uuid/quotes
GET  /api/v1/tirupur-connect/member/quotes
POST /api/v1/tirupur-connect/member/verification-requests
POST /api/v1/tirupur-connect/member/memberships/:planUuid/select
POST /api/v1/tirupur-connect/member/memberships/:membershipUuid/payment-order
POST /api/v1/tirupur-connect/member/memberships/payment-confirm
```

### Admin

Admin APIs accept approved platform-admin tokens or Tirupur Connect staff tokens. Role checks still apply per operation.

```text
GET   /api/v1/tirupur-connect/admin/dashboard
GET   /api/v1/tirupur-connect/admin/submissions
GET   /api/v1/tirupur-connect/admin/submissions/:uuid
PATCH /api/v1/tirupur-connect/admin/submissions/:uuid/review
GET   /api/v1/tirupur-connect/admin/companies
GET   /api/v1/tirupur-connect/admin/companies/:uuid
PATCH /api/v1/tirupur-connect/admin/companies/:uuid/status
GET   /api/v1/tirupur-connect/admin/rfqs
GET   /api/v1/tirupur-connect/admin/rfqs/:uuid
PATCH /api/v1/tirupur-connect/admin/rfqs/:uuid/status
GET   /api/v1/tirupur-connect/admin/inquiries
PATCH /api/v1/tirupur-connect/admin/inquiries/:uuid/status
GET   /api/v1/tirupur-connect/admin/verifications
PATCH /api/v1/tirupur-connect/admin/verifications/:uuid/decision
GET   /api/v1/tirupur-connect/admin/content/:type
POST  /api/v1/tirupur-connect/admin/content/:type
PUT   /api/v1/tirupur-connect/admin/content/:type/:uuid
POST  /api/v1/tirupur-connect/admin/membership-plans
GET   /api/v1/tirupur-connect/admin/frontend-releases
POST  /api/v1/tirupur-connect/admin/frontend-releases
PUT   /api/v1/tirupur-connect/admin/frontend-releases/:uuid
POST  /api/v1/tirupur-connect/admin/frontend-releases/:uuid/activate
GET   /api/v1/tirupur-connect/admin/frontend-designer/pages
GET   /api/v1/tirupur-connect/admin/frontend-designer/pages/:pageKey
POST  /api/v1/tirupur-connect/admin/frontend-designer/sections
PUT   /api/v1/tirupur-connect/admin/frontend-designer/sections/:uuid
POST  /api/v1/tirupur-connect/admin/frontend-designer/items
PUT   /api/v1/tirupur-connect/admin/frontend-designer/items/:uuid
GET   /api/v1/tirupur-connect/admin/audit
```

Supported content types are `event`, `job`, `article`, and `advertisement`.

The protected company detail response combines the normalized company snapshot with its categories, products, verification requests, marketplace account summary, and connector submission provenance. Admin clients must keep supplier-owned profile fields read-only and use the audited status endpoint for publication decisions and review notes.

The protected RFQ detail response combines the buyer requirement with buyer account/company context, supplier quotations, attachments, and related inquiries. Admin clients keep buyer-owned requirement fields read-only and use the audited status endpoint for lifecycle decisions and review notes. RFQ list queries support `search`, `status`, and `privacy` filters.

### Frontend Content Rollout

Frontend page configuration is versioned separately from editorial records. Supported channels are:

- `public-site`
- `client-portal`
- `admin-site`

Each release stores one JSON object payload and a stable SHA-256 checksum. Drafts may be edited. Published and archived releases are immutable. Activating a draft publishes it and archives the previous active release for that channel. Activating an archived release performs a rollback without deleting newer history.

The admin UI is available under **Frontend > Releases** in `apps/b2b-connect-admin`. Public apps should request the active channel payload and retain their compiled static data as a fallback when no release has been published.

The admin UI also provides **Frontend > Designer** for structured page, section, and item content. The home slider is the first connected section. Its ten initial slides are seeded into the product database; active database items override the compiled frontend fallback.

Recommended payload envelope:

```json
{
  "schemaVersion": 1,
  "channel": "public-site",
  "metadata": {},
  "navigation": {},
  "sections": {}
}
```

### Connector Sync

```text
POST /api/v1/tirupur-connect/sync/submissions
```

Required headers:

```text
x-tc-timestamp
x-tc-idempotency-key
x-tc-signature
```

The HMAC input is:

```text
timestamp + "." + idempotencyKey + "." + sha256(stableJson(requestBody))
```

The signature uses `TIRUPUR_CONNECT_SYNC_SECRET`. The exported `createConnectorSignature()` helper applies the same canonical JSON algorithm.

Each accepted update creates a new immutable revision. Sync never publishes or overwrites an approved marketplace snapshot. Marketplace staff must explicitly approve or publish a revision.

## Environment

```text
TIRUPUR_CONNECT_SYNC_SECRET=
TIRUPUR_CONNECT_SYNC_TOLERANCE_SECONDS=300
TIRUPUR_CONNECT_MEMBER_TOKEN_HOURS=168
```

Razorpay membership collection uses the shared `RAZORPAY_*` configuration.

## Central Tables

- `tc_accounts`
- `tc_companies`
- `tc_categories`
- `tc_company_categories`
- `tc_products`
- `tc_submissions`
- `tc_submission_revisions`
- `tc_sync_requests`
- `tc_rfqs`
- `tc_rfq_quotes`
- `tc_inquiries`
- `tc_verification_requests`
- `tc_membership_plans`
- `tc_memberships`
- `tc_payments`
- `tc_content`
- `tc_frontend_releases`
- `tc_frontend_pages`
- `tc_frontend_sections`
- `tc_frontend_section_items`
- `tc_audit_logs`
- `tc_settings`

## Database Migration

The product database has first-class migration-manager support:

```text
npm -w apps/server run db -- setup --target=tirupur-connect
npm -w apps/server run db -- migrate --target=tirupur-connect
npm -w apps/server run db -- seed --target=tirupur-connect
```

On the first migration, known `tc_*` tables are copied from `cxsun_master` using shared column names. Source and destination row counts are verified before master copies are removed. Tirupur Connect is no longer registered in `platform-modules.ts`.

## Remaining Controlled Migration

The old tenant-local `modules/tconnect` marketplace records are not deleted or automatically copied. A separate migration must map tenant 115 legacy data into these central tables, compare counts/public records, switch compatibility routes, and only then retire legacy marketplace ownership.
