# Tenant Domain

## Owns

- Platform domain-to-tenant mappings.
- Tenant domain resolution contract.
- Domain upsert and delete safety checks.

## Does Not Own

- Tenant business records.
- Public site content.
- Billing or Ecommerce domain behavior.

## API Contracts

- `GET /api/v1/tenant-domains`
- `GET /api/v1/tenant-domains/resolve`
- `POST /api/v1/tenant-domains/upsert`
- `DELETE /api/v1/tenant-domains/:id`
- `POST /api/v1/tenant-domains/:id/delete`

## Tables

- `tenant_domains`
- Reads joined `tenants` records for resolution.

## Events

- `platform.tenant_domain.created`
- `platform.tenant_domain.updated`
- `platform.tenant_domain.deleted`

## Queue Jobs

None yet. Add a queue only if future domain changes need DNS/proxy automation, retries, or cross-service fan-out.

## Sync Tags

- `online-only`

## Tests

- `npm -w apps/platform-api run test:contract`
- `npm run typecheck:platform-api`
- `npm run build:platform-api`

The contract test verifies protected tenant-domain route registration without mutating data.
The e2e test verifies tenant-domain create, resolve, force delete, and cleanup.

## Central Docs

- `apps/docs/devdocs/modules/platform-api.md`
- `apps/docs/docs/platform/workspace-foundation.md`
