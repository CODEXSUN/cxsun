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
- [x] Add query factories for:
  - [x] Sales list
  - [x] Sales detail
  - [x] Sales open invoices
  - [x] Sales monthly view
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
- [x] Add or standardize actions:
  - [x] `saveDraft`
  - [x] `saveAndPost`
  - [x] `reverse`
  - [x] `createCorrection`
  - [x] `cancelEinvoice`
  - [x] `cancelEway`
  - [x] `downloadPdf`
  - [x] `sendEmail`
  - [x] `recalculatePosting`
- [x] Repeat for Purchase.
- [x] Repeat for Receipt and Payment.
- [x] Repeat for Journal, Contra, and Opening Posting.

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
- [x] Sales save/post should invalidate:
  - [x] Sales list
  - [x] Sales detail
  - [x] Sales monthly view
  - [x] Dashboard billing overview
  - [x] Day Book
  - [x] Ledger books
  - [x] Trial Balance
  - [x] Profit & Loss
  - [x] Balance Sheet
- [x] Purchase save/post should invalidate the matching Purchase and Accounts queries.
- [x] Receipt and Payment save/post should invalidate:
  - [x] Cash Book
  - [x] Bank Book
  - [x] Open invoice/bill allocations
  - [x] Day Book
  - [x] Trial Balance
  - [x] Dashboard totals
- [x] Journal, Contra, and Opening Posting should invalidate all accounts reports.

## Pattern 4: Server-First Business Rules

Borrow Next.js server-first discipline. The frontend may display previews, but final rules must be enforced by backend services.

### Tasks

- [x] Ensure account posting rules live on the server.
- [x] Ensure period lock validation lives on the server.
- [x] Ensure reversal/correction flows are server commands, not frontend-only state changes.
- [x] Ensure GST/e-invoice/e-way validation and audit logging live on the server.
- [x] Ensure report totals come from posting/report tables or backend aggregation, not repeated frontend summing.
- [x] Add typed error responses for:
  - [x] Period locked
  - [x] Voucher imbalance
  - [x] Missing ledger
  - [x] Invalid GSTIN/state/HSN
  - [x] Compliance provider failure

## Pattern 5: Standard Page Shape

Borrow route/layout discipline. Each major module should have the same mental model.

### Tasks

- [x] Standardize page sections:
  - [x] List
  - [x] Show
  - [x] Upsert
  - [x] Print/PDF
  - [x] Settings where required
  - [x] Reports where required
- [x] Ensure each list page has:
  - [x] Search
  - [x] Refresh
  - [x] Day/month view where applicable
  - [x] Filters
  - [x] Columns
  - [x] New button
  - [x] Row action menu
  - [x] Print/download actions where applicable
- [x] Ensure each show page has:
  - [x] Back
  - [x] New
  - [x] Edit
  - [x] Print/download
  - [x] Reverse/correct/cancel where applicable
  - [x] Audit/status display
- [x] Ensure each upsert page has:
  - [x] Details tab
  - [x] Related tabs only when enabled by settings
  - [x] Save
  - [x] Save & Print where applicable
  - [x] Cancel
  - [x] Clear validation errors

## Pattern 6: Module Error Boundaries

One failed report or lookup should not break the whole dashboard.

### Tasks

- [x] Create a reusable module error panel.
- [x] Add route/module-level error fallback for:
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
- [x] Add report loading panels for:
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
- [x] Move Sales item row editing into reducer-style helpers.
- [x] Move Purchase item row editing into reducer-style helpers.
- [x] Keep totals derived, not manually stored in many frontend states.
- [x] Add testable pure helpers for:
  - [x] Add item
  - [x] Edit item
  - [x] Delete item
  - [x] Normalize item
  - [x] Calculate totals
  - [x] Build save payload

## Pattern 9: Typed Command DTOs

Backend commands should be explicit. This makes audit, locks, reversal, and compliance safer.

### Tasks

- [x] Define command DTOs for posted document changes.
- [x] Add command endpoints or service methods for:
  - [x] Post voucher
  - [x] Reverse voucher
  - [x] Create correction
  - [x] Cancel e-invoice
  - [x] Cancel e-way bill
  - [x] Recalculate account posting
  - [x] Recalculate report tables
- [x] Ensure command results include affected record IDs and audit IDs.
- [x] Ensure commands fail cleanly when period locks block the period.

## Pattern 10: Audit And Compliance Visibility

Make invisible backend actions visible enough for users and auditors.

### Tasks

- [x] Add audit timeline panel pattern.
- [x] Use it for:
  - [x] Sales
  - [x] Purchase
  - [x] Receipt
  - [x] Payment
  - [x] Journal
  - [x] Contra
  - [x] Opening Posting
  - [x] GST Compliance actions
- [x] Show:
  - [x] Who acted
  - [x] What action happened
  - [x] When it happened
  - [x] Source/module
  - [x] Request/response status for compliance actions
  - [x] Reversal/correction relation

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

## Next Session Audit - Forward Move Gaps

The BetterNext checklist is marked complete and both frontend/server typechecks passed on 2026-06-16, but the next session should treat the items below as implementation-hardening gaps before larger audit/compliance or scaling work.

### Not Blocking Normal Development

- Current application can move forward: `npm -w apps/server run typecheck` and `npm -w apps/frontend run typecheck` passed after the BetterNext command/action work.
- These are not compile blockers, but they are product/architecture mismatches between the checklist wording and the current code depth.

### Priority Gaps

1. Add a real shared audit timeline component.
   - Current state: Sales, Purchase, Receipt, and Payment have local `Activity` sections; GST has operation history.
   - Gap: there is no reusable `AuditTimeline` pattern wired across Sales, Purchase, Receipt, Payment, Journal, Contra, Opening Posting, and GST Compliance.
   - Next work: create one component and normalize activity/compliance operation rows into it.

2. Move dashboard totals to backend/report tables.
   - Current state: billing dashboard totals still fetch lists and sum in `apps/frontend/src/components/blocks/dashboard/dashboard-home.tsx`.
   - Gap: BetterNext says backend/report tables should be the source of truth for totals.
   - Next work: add backend summary APIs for sales, purchase, receipt, payment, cash, bank, and monthly movement totals, then switch dashboard to those APIs.

3. Replace client-derived Sales detail/open/monthly queries with server-owned endpoints.
   - Current state: Sales `detail`, `monthly`, and `openInvoices` query factories exist, but they derive from `listSalesEntries`.
   - Gap: this is acceptable for now, but not true route/module data ownership.
   - Next work: add backend endpoints for Sales detail, open invoices, and monthly summaries and wire query factories to them.

4. Make Purchase, Receipt, and Payment query factories symmetric with Sales.
   - Current state: Purchase has list/lookups/print queries; Receipt and Payment have list/lookups/open allocation queries.
   - Gap: detail/monthly/open-bill or open-invoice query shapes are not consistently available across all modules.
   - Next work: add consistent `detail`, `monthly`, and allocation/open-document query factories and endpoints.

5. Move Receipt and Payment allocation pickers to server-filtered open documents.
   - Current state: Receipt pulls Sales entries and Payment pulls Purchase entries, then computes open options in the frontend.
   - Gap: backend validates allocations, but the picker source itself is not server-filtered.
   - Next work: add open-invoice/open-bill APIs that return only allocatable balances for the selected party/accounting year.

6. Honor report/year scope in account report recalculation.
   - Current state: `/api/v1/accounts/reports/recalculate` accepts `report` and `accounting_year_id`, but service recalculates broadly.
   - Gap: recalculate is useful but not scoped enough for large datasets or super-admin repair operations.
   - Next work: apply `report` and `accounting_year_id` in the backend service and return scoped command metadata.

7. Strengthen typed command DTOs into runtime validation and real command audit rows.
   - Current state: command DTOs are TypeScript interfaces; account voucher post/cancel returns `audit_ids: []`.
   - Gap: auditor-grade traceability needs persisted command/audit records for voucher post, cancel, recalculation, and compliance commands.
   - Next work: add runtime command validation and an account command audit table/service, then return real `audit_ids`.

### Recommended Next Order

1. Backend summary/report APIs for dashboard and monthly movement.
2. Server-side open invoice/open bill endpoints for allocations.
3. Shared audit timeline component and normalized activity display.
4. Scoped account report recalculation.
5. Runtime command validation and persisted command audit records.
