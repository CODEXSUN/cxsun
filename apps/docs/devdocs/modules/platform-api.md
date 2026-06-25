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

The first `apps/platform-api` scaffold imports existing transition-backend modules from `apps/server` and starts only the foundation API surface:

- Health
- Auth
- Tenant
- Tenant Domain
- Industry

Do not remove these modules from `apps/server` until Platform API and Billing API are both verified.

## Standards Documents

- `apps/platform-api/docs/STANDARDS.md`
- `apps/platform-api/docs/CONTRACTS.md`
- `apps/platform-api/docs/EXTRACTION.md`

## App Contract

Other services can depend on Platform API through documented APIs or shared contracts. They must not duplicate auth, tenant resolution, RBAC, mail, notification, or file logic.
