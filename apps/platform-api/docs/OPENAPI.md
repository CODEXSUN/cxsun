# Platform API Contract Index

This is the lightweight route contract index until a generated OpenAPI file is added.

## Public

- `GET /health`
- `POST /api/v1/service-tokens/verify`

## Platform Auth

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `GET /api/v1/admin-users`
- `POST /api/v1/admin-users/upsert`
- `GET /api/v1/users/tenant-summary`
- `GET /api/v1/tenants/:tenantId/users`
- `POST /api/v1/users/upsert`

## Tenant Foundation

- `GET /api/v1/tenants`
- `POST /api/v1/tenants/upsert`
- `GET /api/v1/tenants/context`
- `GET /api/v1/tenants/:tenantId/setup-status`
- `POST /api/v1/tenants/:tenantId/setup-client`
- `POST /api/v1/tenants/:tenantId/reset-database`
- `DELETE /api/v1/tenants/:tenantId`
- `POST /api/v1/tenants/:tenantId/restore`
- `GET /api/v1/tenant-domains`
- `POST /api/v1/tenant-domains/upsert`
- `GET /api/v1/tenant-domains/resolve`
- `POST /api/v1/tenant-domains/:id/delete`
- `GET /api/v1/industries`
- `POST /api/v1/industries/upsert`

## Platform Foundation

- `GET /api/v1/rbac/policies`
- `POST /api/v1/rbac/policies/upsert`
- `GET /api/v1/tenants/:tenantId/rbac/policies`
- `POST /api/v1/tenants/:tenantId/rbac/policies/upsert`
- `POST /api/v1/rbac/check`
- `GET /api/v1/tenants/:tenantId/companies`
- `GET /api/v1/tenants/:tenantId/accounting-years`
- `GET /api/v1/app-registry`
- `POST /api/v1/app-registry/upsert`
- `GET /api/v1/tenants/:tenantId/apps`
- `POST /api/v1/tenants/:tenantId/apps/upsert`
- `GET /api/v1/service-tokens`
- `POST /api/v1/service-tokens`
- `GET /api/v1/audit-events`
- `POST /api/v1/audit-events`
- `GET /api/v1/notifications`
- `POST /api/v1/notifications`
- `GET /api/v1/mail-requests`
- `POST /api/v1/mail-requests`
- `GET /api/v1/files`
- `POST /api/v1/files`
- `POST /api/v1/outbox/process`

All protected routes require a Platform bearer token. Business services should use service-token verification first, then call stable Platform API contracts instead of reading Platform-owned tables directly.
