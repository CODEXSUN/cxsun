# Export Sales Entry Module

Export Sales Entry is the fourth native Billing API module moved into `apps/billing-api/src/modules`.

## Owns

- `GET /api/v1/entries/export-sales`
- `GET /api/v1/entries/export-sales/:idOrUuid`
- `POST /api/v1/entries/export-sales/upsert`
- export sales destroy, restore, comments, tools, and PDF routes
- export sales aggregate, domain events, event bus, persistence, and migration
- export document numbering and document/email/PDF handoff

## Current Phase

This is a Phase 2 native route-module extraction. The export sales controller, service, event bus, aggregate, domain events, entities, repository, migration, and module class now live in Billing API.

The module still uses transitional compatibility dependencies for framework decorators, tenant context, auth repositories, queue runtime, document numbering, mail, and PDF rendering. Do not remove those shared compatibility modules until Billing API has its own shared infrastructure boundary.

## Verification

```bash
npm run typecheck:billing-api
npm run build:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
```

The export sales module test asserts that Billing API mounts the native export sales module instead of the compatibility server export sales module.
