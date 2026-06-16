# Better Framework Patterns For Our Existing App

## Purpose

We are not migrating the app to Remix or Next.js. The goal is to adapt the best framework patterns into the current Codexsun ecosystem:

- Frontend: Vite + React + TanStack Query
- Backend: server API with tenant-isolated modules
- Product focus: billing, accounting, compliance, reports, audit, and operational dashboards

This document converts those framework ideas into practical tasks we can implement module by module without breaking existing flows.

## Direction

Keep the current architecture. Improve consistency, correctness, and maintainability by borrowing these ideas:

- Remix-style route/module data ownership
- Remix-style action discipline for mutations
- Remix-style revalidation after mutations
- Next.js-style server-first security boundaries
- Next.js-style route/layout organization
- Strong loading, error, and recovery states for module pages

## Principles

- Backend remains the source of truth for accounting, posting, compliance, locks, audit, and report totals.
- Frontend should not duplicate business-critical posting logic.
- Every module should have predictable `list`, `show`, `upsert`, `post`, `reverse`, `cancel`, `delete/suspend`, and `recalculate` behavior where applicable.
- Every mutation should have a clear invalidation/revalidation map.
- Every complex page should have a module-level loading and error state.
- Existing screens should be upgraded gradually, not rewritten in one sweep.

## Pattern 1: Module Query Factories

Create query-key and query-function factories per module so lists, detail pages, reports, and invalidation are not scattered across components.

### Tasks

- [x] Create a query factory pattern for one pilot module.
- [x] Start with Sales because it touches entries, posting, reports, print, PDF, and dashboard totals.
- [ ] Add query factories for:
  - [x] Sales list
  - [ ] Sales detail
  - [ ] Sales open invoices
  - [ ] Sales monthly view
  - [x] Sales print/company lookup
  - [x] Sales common lookups
- [x] Add a shared invalidation helper for Sales mutations.
- [x] Repeat the same structure for Purchase.
- [x] Repeat for Receipt and Payment.
- [x] Repeat for Accounts reports: Day Book, Trial Balance, P&L, Balance Sheet, Cash Book, Bank Book.

### Target Shape

```ts
salesQueries.list(session, filters)
salesQueries.detail(session, id)
salesQueries.openInvoices(session)
salesQueries.monthly(session, yearId)

salesInvalidations.afterSave(queryClient, session)
salesInvalidations.afterPost(queryClient, session)
salesInvalidations.afterReverse(queryClient, session)
```

## Pattern 2: Module Action Layer

Borrow Remix's action discipline, but keep it inside our current API client/service model. Each business action should be explicit and named.

### Tasks

- [x] Create a module action pattern for Sales.
- [x] Split generic save behavior from accounting/compliance actions.
- [ ] Add or standardize actions:
  - [x] `saveDraft`
  - [x] `saveAndPost`
  - [x] `reverse`
  - [x] `createCorrection`
  - [ ] `cancelEinvoice`
  - [ ] `cancelEway`
  - [x] `downloadPdf`
  - [x] `sendEmail`
  - [ ] `recalculatePosting`
- [x] Repeat for Purchase.
- [x] Repeat for Receipt and Payment.
- [ ] Repeat for Journal, Contra, and Opening Posting.

### Target Shape

```ts
salesActions.saveDraft(session, input)
salesActions.post(session, input)
salesActions.reverse(session, id, reason)
salesActions.cancelEinvoice(session, id, reason)
salesActions.recalculatePosting(session, id)
```

## Pattern 3: Mutation Revalidation Map

Every mutation must refresh the correct dependent data. This is especially important for accounting dashboards and reports.

### Tasks

- [x] Create a central revalidation map for Sales posting.
- [ ] Sales save/post should invalidate:
  - [x] Sales list
  - [ ] Sales detail
  - [ ] Sales monthly view
  - [x] Dashboard billing overview
  - [x] Day Book
  - [x] Ledger books
  - [x] Trial Balance
  - [x] Profit & Loss
  - [x] Balance Sheet
- [x] Purchase save/post should invalidate the matching Purchase and Accounts queries.
- [ ] Receipt and Payment save/post should invalidate:
  - [x] Cash Book
  - [x] Bank Book
  - [x] Open invoice/bill allocations
  - [x] Day Book
  - [x] Trial Balance
  - [x] Dashboard totals
- [ ] Journal, Contra, and Opening Posting should invalidate all accounts reports.

## Pattern 4: Server-First Business Rules

Borrow Next.js server-first discipline. The frontend may display previews, but final rules must be enforced by backend services.

### Tasks

- [ ] Ensure account posting rules live on the server.
- [ ] Ensure period lock validation lives on the server.
- [ ] Ensure reversal/correction flows are server commands, not frontend-only state changes.
- [ ] Ensure GST/e-invoice/e-way validation and audit logging live on the server.
- [ ] Ensure report totals come from posting/report tables or backend aggregation, not repeated frontend summing.
- [ ] Add typed error responses for:
  - [ ] Period locked
  - [ ] Voucher imbalance
  - [ ] Missing ledger
  - [ ] Invalid GSTIN/state/HSN
  - [ ] Compliance provider failure

## Pattern 5: Standard Page Shape

Borrow route/layout discipline. Each major module should have the same mental model.

### Tasks

- [ ] Standardize page sections:
  - [ ] List
  - [ ] Show
  - [ ] Upsert
  - [ ] Print/PDF
  - [ ] Settings where required
  - [ ] Reports where required
- [ ] Ensure each list page has:
  - [ ] Search
  - [ ] Refresh
  - [ ] Day/month view where applicable
  - [ ] Filters
  - [ ] Columns
  - [ ] New button
  - [ ] Row action menu
  - [ ] Print/download actions where applicable
- [ ] Ensure each show page has:
  - [ ] Back
  - [ ] New
  - [ ] Edit
  - [ ] Print/download
  - [ ] Reverse/correct/cancel where applicable
  - [ ] Audit/status display
- [ ] Ensure each upsert page has:
  - [ ] Details tab
  - [ ] Related tabs only when enabled by settings
  - [ ] Save
  - [ ] Save & Print where applicable
  - [ ] Cancel
  - [ ] Clear validation errors

## Pattern 6: Module Error Boundaries

One failed report or lookup should not break the whole dashboard.

### Tasks

- [x] Create a reusable module error panel.
- [ ] Add route/module-level error fallback for:
  - [x] Sales
  - [x] Purchase
  - [x] Receipt
  - [x] Payment
  - [x] Accounts
  - [x] GST Compliance
  - [x] Settings
- [x] Show backend typed errors in a client-friendly way.
- [x] Show lock reason/source when save is blocked by a period lock.
- [x] Add retry/refresh controls to error panels.

## Pattern 7: Loading And Skeleton States

Borrow streaming/skeleton discipline without changing frameworks.

### Tasks

- [x] Add consistent skeletons for list pages.
- [x] Add compact loading states for lookup/autocomplete fields.
- [ ] Add report loading panels for:
  - [x] Trial Balance
  - [x] Profit & Loss
  - [x] Balance Sheet
  - [x] Monthly Movement
  - [x] Cash Book
  - [x] Bank Book
- [x] Avoid blocking the whole module when only one lookup is loading.

## Pattern 8: Form State Reducers

Large entry forms are getting complex. Use reducer-style updates for high-risk forms so field updates, item rows, totals, and posting settings stay predictable.

### Tasks

- [x] Pilot a reducer in Journal or Contra first because the posting table is bounded.
- [ ] Move Sales item row editing into reducer-style helpers.
- [ ] Move Purchase item row editing into reducer-style helpers.
- [x] Keep totals derived, not manually stored in many frontend states.
- [ ] Add testable pure helpers for:
  - [x] Add item
  - [x] Edit item
  - [x] Delete item
  - [x] Normalize item
  - [x] Calculate totals
  - [x] Build save payload

## Pattern 9: Typed Command DTOs

Backend commands should be explicit. This makes audit, locks, reversal, and compliance safer.

### Tasks

- [ ] Define command DTOs for posted document changes.
- [ ] Add command endpoints or service methods for:
  - [ ] Post voucher
  - [ ] Reverse voucher
  - [ ] Create correction
  - [ ] Cancel e-invoice
  - [ ] Cancel e-way bill
  - [ ] Recalculate account posting
  - [ ] Recalculate report tables
- [ ] Ensure command results include affected record IDs and audit IDs.
- [ ] Ensure commands fail cleanly when period locks block the period.

## Pattern 10: Audit And Compliance Visibility

Make invisible backend actions visible enough for users and auditors.

### Tasks

- [ ] Add audit timeline panel pattern.
- [ ] Use it for:
  - [ ] Sales
  - [ ] Purchase
  - [ ] Receipt
  - [ ] Payment
  - [ ] Journal
  - [ ] Contra
  - [ ] Opening Posting
  - [ ] GST Compliance actions
- [ ] Show:
  - [ ] Who acted
  - [ ] What action happened
  - [ ] When it happened
  - [ ] Source/module
  - [ ] Request/response status for compliance actions
  - [ ] Reversal/correction relation

## Suggested Rollout Order

1. Sales query/action factory and invalidation map.
2. Purchase query/action factory and invalidation map.
3. Receipt and Payment allocation/posting invalidation.
4. Journal and Contra action layer cleanup.
5. Accounts report invalidation and recalculate command map.
6. Module error panels and typed backend error display.
7. Period lock blocked-save UI details.
8. Audit timeline panel.
9. Form reducers for Sales/Purchase items.
10. Extend pattern to remaining modules.

## Success Criteria

- Developers can open one module and know where queries, actions, invalidations, and DTOs live.
- Users see consistent list/show/upsert behavior across entries and accounts.
- Posting changes always refresh affected reports and dashboard totals.
- Locked periods cannot be mutated silently.
- Reversals/corrections are explicit and auditable.
- Compliance actions preserve request, response, status, retry, cancellation, and audit details.
- We gain the best discipline from Remix and Next.js without migrating the app.
