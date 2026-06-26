# Quotation Entry

## Summary

Quotation Entry is the Billing API module for preparing sales quotations, tracking quotation lifecycle activity, producing printable/PDF documents, and converting one or more quotations into a Sales Entry invoice.

Module root: `apps/billing-api/src/modules/entries/quotation`

Public route prefix: `/api/v1/entries/quotation`

## Current ownership

- Native Billing API route module, not a combined-server route.
- Uses DDD-style folders:
  - `domain` for quotation aggregate/entity/event definitions.
  - `application` for orchestration, lifecycle rules, and event publishing.
  - `infrastructure/persistence` for tenant database persistence.
  - `interface/http` for the v1 HTTP controller.
  - `database/migrations` for tenant table creation.
- Tenant migration exports are still mirrored through `packages/platform` for the shared tenant provisioning runner. That is migration bridge debt, not route ownership.

## Done

- List, get, upsert, suspend/destroy, restore, comment, tools, and PDF download routes are mounted in Billing API.
- Quotation creation/update persists header, address, item, charge, activity, comment, and generated-invoice state.
- Quotation lifecycle emits native Billing API events through `QuotationEntryEventBus`.
- PDF rendering uses the shared entry document PDF service while Billing-specific route ownership stays in this module.
- `POST /api/v1/entries/quotation/generate-invoice` validates selected quotations, blocks mixed-contact conversion, blocks already-invoiced quotations, creates the linked Sales Entry, and marks source quotations as invoiced.
- Billing mutation e2e coverage exercises Quotation create/update paths through the real Billing API HTTP surface.

## Current gaps

- Quotation still depends on shared Platform compatibility services for tenant context, document numbering, mail/PDF helpers, and framework decorators.
- Shared entry document helpers live under `@cxsun/platform/modules/entries/shared`; Billing should later own or formally import them through a documented shared contract.
- Quotation migration ownership is duplicated between `apps/billing-api` and `packages/platform` until the tenant provisioning runner can use service-owned migration bundles.
- Frontend quotation tests cover the main path through Billing e2e, but the browser workflow should still receive focused coverage for create/edit/convert edge cases.
- Quotation table names remain legacy-compatible and are not yet renamed into a clean `billing_*` table group.

## Future concepts

- Add a formal quotation approval/expiry workflow before invoice generation.
- Add quotation revision history so customer-facing versions can be compared.
- Add duplicate/clone quotation actions for repeat quotes.
- Add conversion audit details showing exactly which quotation lines became which Sales Entry lines.
- Move mail/PDF/document-number dependencies behind Billing-owned services or a documented shared entry-document package.
- When tenant provisioning becomes service-owned, remove the mirrored quotation migration from `packages/platform`.

## Verification

```bash
npm run typecheck:billing-api
npm -w apps/billing-api run test:contract
npm -w apps/billing-api run test:modules
npm -w apps/billing-api run test:e2e
npm -w apps/billing-api run test:mutations
```
