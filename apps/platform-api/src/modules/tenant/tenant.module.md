# Tenant

## Owns

- Platform tenant records.
- Tenant context resolution.
- Tenant setup/reset commands through shared tenant-database infrastructure.
- Tenant policy bootstrap for company, RBAC, and mail.

## Does Not Own

- Tenant business records.
- Billing, Ecommerce, CRM, or Sites tables.
- CXSync clone/mirror operations.

## API Contracts

- `GET /api/v1/tenants`
- `GET /api/v1/tenants/events`
- `GET /api/v1/tenants/context`
- `POST /api/v1/tenants/upsert`
- `GET /api/v1/tenants/:id/setup-status`
- `POST /api/v1/tenants/:id/setup-client`
- `POST /api/v1/tenants/:id/reset-database`
- `DELETE /api/v1/tenants/:id`
- `POST /api/v1/tenants/:id/destroy`
- `POST /api/v1/tenants/:id/restore`

## Tables

- `tenants`
- `rbac_policies`
- `tenant_rbac_policies`
- Reads tenant-local `companies` for context diagnostics.

## Events

- `platform.tenant.created`
- `platform.tenant.updated`
- `platform.tenant.deleted`
- `platform.tenant.restored`

## Queue Jobs

- `platform.tenant.database.provision`

Tenant provisioning is slow and database-mutating, so it is queued when a tenant is created.

## Sync Tags

- `online-only`

## Tests

- `npm -w apps/platform-api run test:contract`
- `npm run typecheck:platform-api`
- `npm run build:platform-api`

The contract test verifies tenant context behavior and protected tenant routes without mutating data.
The e2e test verifies tenant create, setup status, context resolution, and cleanup without provisioning a tenant database.

## Central Docs

- `apps/docs/devdocs/modules/platform-api.md`
- `apps/docs/docs/platform/workspace-foundation.md`
