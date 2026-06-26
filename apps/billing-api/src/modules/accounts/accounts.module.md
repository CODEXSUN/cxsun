# Accounts And Billing Reports Module

Accounts is the Billing API module for accounting ledgers, vouchers, books, posting controls, and billing reports.

## Owns

- `GET /api/v1/accounts/chart/groups`
- `GET /api/v1/accounts/ledgers`
- `GET /api/v1/accounts/ledgers/:type`
- `POST /api/v1/accounts/ledgers/:type/upsert`
- `GET/POST /api/v1/accounts/vouchers`
- voucher post/cancel commands
- day book, ledger statement, trial balance, profit/loss, and balance sheet reports
- cash book and bank book entry routes
- report recalculation and source reposting commands
- period lock list/create/release contracts

## Current Phase

This is part of the Billing API reports and pending-accounting extraction phase. The accounts controller, service, repositories, migration, posting service, and module class now live in Billing API.

The module still uses transitional compatibility dependencies for framework decorators, tenant context, auth repositories, document numbering, entry posting controls, and Sales entry types. Receipt, Payment, and Purchase posting services now use this native Accounts module. Sales can be switched after Sales Entry is moved natively.

## Structure Gap

Accounts is native Billing API code, but it is still a broad flat module covering ledgers, vouchers, books, reports, and posting controls. If DDD remains the Billing API standard, split Accounts later into clearer domain/application/infrastructure/interface folders, and consider separating ledger master, posting, reporting, and book workflows while preserving public route contracts.

## Verification

```bash
npm run typecheck:billing-api
npm run build:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
```

The accounts module test asserts that Billing API mounts the native accounts/report module instead of the compatibility server accounts module.
