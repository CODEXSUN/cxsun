# Health

## Owns

- Platform API runtime health response.
- Service identity in health payload.

## Does Not Own

- Database diagnostics.
- Tenant diagnostics.
- CXSync diagnostics.

## API Contracts

- `GET /health`

## Tables

None yet.

## Events

None yet.

## Queue Jobs

None yet.

## Sync Tags

- `online-only`

## Tests

- `npm -w apps/platform-api run test:contract`
- `npm -w apps/platform-api run test:smoke`

## Central Docs

- `apps/docs/devdocs/modules/platform-api.md`
- `apps/docs/docs/platform/workspace-foundation.md`
