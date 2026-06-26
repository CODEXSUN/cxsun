# Platform API Module

Platform API is the shared foundation service for every tenant app.

## Naming

Use **Platform API** for the deployable service and workspace: `apps/platform-api`.

Use **core** for internal framework/foundation code and tenant table prefixes such as `core_users`.

## Owns

- Tenant resolution
- Auth, users, sessions, and service tokens
- Companies and accounting years
- RBAC, permissions, and tenant app enablement
- Mail delivery contracts
- Notifications
- Files/media references
- Audit logs
- Shared settings and app registry

## Does Not Own

- Billing invoices or receipts
- Ecommerce orders or carts
- CRM leads or pipelines
- Site pages or blog posts
- CXSync clone, mirror, or migration workflows

## Tenant Tables

Platform-owned tenant tables should use the `core_` prefix and exist for every tenant.

Examples:

```text
core_users
core_companies
core_accounting_years
core_rbac_roles
core_rbac_permissions
core_app_enablement
core_mail_settings
core_notifications
core_files
core_audit_logs
```

## Current Scaffold

The first `apps/platform-api` service owns its runtime/core/infrastructure locally and starts only the foundation API surface:

- Health, now native under `apps/platform-api/src/modules/health`
- Auth, now native under `apps/platform-api/src/modules/auth`
- Tenant, now native under `apps/platform-api/src/modules/tenant`
- Tenant Domain, now native under `apps/platform-api/src/modules/tenant-domain`
- Industry, now native under `apps/platform-api/src/modules/industry`
- Platform Foundation, now native under `apps/platform-api/src/modules/platform-foundation`

Platform Foundation includes RBAC, app registry, tenant app enablement, service-token verification, company/accounting-year context, audit, notifications, mail requests, file metadata, and durable queue processing.

Do not remove matching compatibility modules from the combined backend until Platform API and Billing API are both verified, but Platform API itself must not import from `apps/server`.

## Frontend Connection

The active frontend can call Platform API separately from the current combined backend.

- `VITE_API_BASE_URL` remains the combined backend / business API base.
- `VITE_PLATFORM_API_BASE_URL` points to Platform API. Development sample: `http://localhost:6105`.
- If `VITE_PLATFORM_API_BASE_URL` is not set, platform-owned clients fall back to `VITE_API_BASE_URL` for transition safety.

Frontend clients that use Platform API when configured:

- Auth login/session
- Industry
- Tenant
- Tenant Domain
- Admin Users and tenant user-management

Business modules such as Billing entries, CRM, Sites content, Accounts, Inventory, and other tenant business APIs still use `VITE_API_BASE_URL` until their backend services are extracted.

The Super Admin dashboard includes a Platform Foundation page for live-preparation checks and service-token creation.

## Standards Documents

- `apps/platform-api/docs/STANDARDS.md`
- `apps/platform-api/docs/CONTRACTS.md`
- `apps/platform-api/docs/EXTRACTION.md`
- `apps/platform-api/docs/MODULE-DOCS.md`
- `apps/platform-api/docs/OPENAPI.md`

## Documentation Rule

Each future Platform API module should keep a local module note beside code and publish user-visible guidance into the central docs app. Client-facing docs belong under `apps/docs/docs`, while developer/service docs belong under `apps/docs/devdocs`.

## App Contract

Other services can depend on Platform API through documented APIs or shared contracts. They must not duplicate auth, tenant resolution, RBAC, mail, notification, or file logic.
