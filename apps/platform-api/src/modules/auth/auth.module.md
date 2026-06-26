# Auth Module

Platform API owns the shared identity surface used by platform administration and tenant entry.

## Responsibilities

- Login and session validation for tenant, admin, and super-admin surfaces.
- Platform admin user management.
- Tenant user listing and upsert support for authorized platform or tenant managers.
- Tenant-domain-aware login protection.

## Boundaries

- Platform admin users live in the master MariaDB schema.
- Tenant users remain inside each tenant database.
- JWT signing, password hashing, database connection, and HTTP decorator runtime are still imported from the shared server infrastructure until that framework is extracted.

## Routes

- `POST /api/v1/auth/login`
- `GET /api/v1/auth/session`
- `GET /api/v1/users/tenant-summary`
- `GET /api/v1/users/tenant/:tenantId`
- `POST /api/v1/users/upsert`
- `GET /api/v1/admin-users`
- `POST /api/v1/admin-users/upsert`

## Events And Sync

- Auth currently performs synchronous user/account changes.
- Add platform events before introducing audit sinks, external projections, or notifications.

## Tests

- `npm -w apps/platform-api run test:contract` verifies auth session behavior and protected user/admin routes without mutating data.
- `npm -w apps/platform-api run test:e2e` verifies real super-admin login, session, admin user listing, and platform bearer access with isolated cleanup.
