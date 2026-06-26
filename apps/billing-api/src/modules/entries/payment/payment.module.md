# Payment Entry Module

Payment Entry is the second native Billing API module moved into `apps/billing-api/src/modules`.

## Owns

- `GET /api/v1/entries/payment`
- `GET /api/v1/entries/payment/:idOrUuid`
- `POST /api/v1/entries/payment/upsert`
- payment destroy, restore, correction, reversal, comments, tools, and PDF routes
- payment entry persistence and allocation validation
- payment accounting posting handoff

## Current Phase

This is a Phase 2 native route-module extraction. The payment controller, service, repository, types, migration, and module class now live in Billing API.

The module still uses transitional compatibility dependencies for framework decorators, tenant context, auth repositories, document numbering, mail, PDF rendering, entry posting control, and accounts posting. Do not remove those shared compatibility modules until Billing API has its own shared infrastructure boundary.

## Structure Gap

Payment is native Billing API code, but its folder shape is still flatter than the preferred DDD-style Billing modules such as Sales, Purchase, Quotation, Export Sales, and stock vouchers. If DDD remains the Billing API standard, normalize Payment later into domain/application/infrastructure/interface folders without changing route contracts.

## Verification

```bash
npm run typecheck:billing-api
npm run build:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
```

The payment module test asserts that Billing API mounts the native payment module instead of the compatibility server payment module.
