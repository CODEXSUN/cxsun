# Industry

## Owns

- Platform-level industry catalog records.
- Industry code normalization.
- Industry create/update/suspend/restore contracts.

## Does Not Own

- Tenant business records.
- Billing app enablement.
- Ecommerce/CRM/Sites app schemas.

## API Contracts

- `GET /api/v1/industries`
- `POST /api/v1/industries/upsert`
- `POST /api/v1/industries/:id/destroy`
- `POST /api/v1/industries/:id/restore`

## Tables

- `industries` in the master/platform MariaDB database.

## Events

- `platform.industry.created`
- `platform.industry.updated`
- `platform.industry.suspended`
- `platform.industry.restored`

## Queue Jobs

None yet. Industry changes are immediate and small. Add queue jobs only if a future change needs fan-out, retries, or cross-service delivery.

## Sync Tags

- `online-only`

## Tests

- `npm -w apps/platform-api run test:contract`
- `npm run typecheck:platform-api`
- `npm run build:platform-api`

The contract test verifies protected industry route registration without mutating data.
The e2e test verifies industry create, list, suspend, restore, and cleanup.

## Central Docs

- `apps/docs/devdocs/modules/platform-api.md`
- `apps/docs/docs/platform/workspace-foundation.md`
