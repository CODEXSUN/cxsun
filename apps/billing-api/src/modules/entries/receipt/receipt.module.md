# Receipt Entry Module

Receipt Entry is the first native Billing API module moved into `apps/billing-api/src/modules`.

## Owns

- `GET /api/v1/entries/receipt`
- `GET /api/v1/entries/receipt/:idOrUuid`
- `POST /api/v1/entries/receipt/upsert`
- receipt destroy, restore, correction, reversal, comments, tools, and PDF routes
- receipt entry persistence and allocation validation
- receipt accounting posting handoff

## Current Phase

This is a Phase 2 native route-module extraction. The receipt controller, service, repository, types, migration, and module class now live in Billing API.

The module still uses transitional compatibility dependencies for framework decorators, tenant context, auth repositories, document numbering, mail, PDF rendering, entry posting control, and accounts posting. Do not remove those shared compatibility modules until Billing API has its own shared infrastructure boundary.

## Structure Gap

Receipt is native Billing API code, but its folder shape is still flatter than the preferred DDD-style Billing modules such as Sales, Purchase, Quotation, Export Sales, and stock vouchers. If DDD remains the Billing API standard, normalize Receipt later into domain/application/infrastructure/interface folders without changing route contracts.

## Verification

```bash
npm run typecheck:billing-api
npm run build:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
```

The receipt module test asserts that Billing API mounts the native receipt module instead of the compatibility server receipt module.
