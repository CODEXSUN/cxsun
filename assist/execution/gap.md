# Billing Gap Analysis

Updated: 2026-06-04

## Scope Reviewed

This scan focused on the current billing and billing-adjacent code paths:

- Frontend billing entries: sales, purchase, receipt, payment, cash book, bank book.
- Inventory-linked billing flows: purchase receipt, delivery note, stock ledger and barcode verification.
- Reports: customer statement, supplier statement, GST statement.
- Settings: company software settings, document numbering, sales layout/print options.
- Backend tenant modules: entries/sales, entries/purchase, entries/receipt, entries/payment, accounts, stock, settings.

## Current Strengths

1. Core entry surfaces exist end to end.

- Sales and purchase have list, show, print preview, upsert, comments, tools, activities, document numbers, GST fields, transport fields, e-invoice/e-way fields, round-off, balances, and item tables.
- Receipts and payments have list, show, print, upsert, allocations, comments, tools, activities, and document numbers.
- Cash book and bank book now have voucher list, show, print, comments, tools, activities, ledger selection, and document numbers.
- Purchase receipt, delivery note, and stock ledger are present under the inventory/stock area.

2. Tenant isolation shape is present.

- Billing modules run under tenant database context.
- Tables include tenant/company/accounting-year context on main entries.
- Dashboard routes lazy-load billing modules.

3. Numbering foundation is in place.

- Document number settings cover `sales`, `purchase`, `purchaseReceipt`, `deliveryNote`, `payment`, `receipt`, `cashBook`, and `bankBook`.
- Most entry repositories consume document numbers and handle duplicate/manual-number conflicts.

4. Print work is active and practical.

- Sales/purchase/delivery/purchase-receipt have dedicated print templates.
- Account vouchers now have tighter show/print formatting.
- Company letterhead settings feed into billing documents.

5. Reports have useful first versions.

- Customer statement combines sales and receipts.
- Supplier statement combines purchases and payments.
- GST statement combines sales and purchases with opening GST settings.

## Main Gaps

### 1. GST and Compliance Are Still Preview-Level

Current state:

- Sales and purchase forms store IRN, Ack no, Ack date, Signed QR, E-way bill no/date, transport data, and vehicle data.
- Generate buttons create random/local preview numbers and show messages that live gateway wiring will be added later.
- GST report calculates from local item tax fields.

Gaps to fill:

- Add real e-invoice gateway integration with request/response persistence.
- Add real e-way bill gateway integration with part A / part B behavior.
- Store gateway status, request payload, response payload, error code/message, generated/cancelled timestamps, and retry state.
- Add cancel e-invoice and cancel e-way flows.
- Add validation before generation: GSTIN, state code, HSN, taxable values, invoice date, distance/vehicle/transport fields.
- Add QR generation from signed QR payload, not static text.
- Add audit log for every compliance action.

Priority: High.

### 2. Accounting Posting Is Not Complete

Current state:

- Cash and bank books have ledgers and voucher balances.
- Sales, purchase, receipt, and payment keep their own totals and payment statuses.
- Receipt/payment allocations are stored as manual rows.

Gaps to fill:

- Create a real posting engine that converts sales, purchase, receipt, payment, cash voucher, and bank voucher into ledger movements.
- Add chart of accounts, ledger groups, tax ledgers, customer/supplier ledgers, and posting rules.
- Keep receivable/payable balances derived from postings, not manually typed allocation balances.
- Add journal/contra/debit note/credit note support or a clear plan for them.
- Add period locks so posted entries cannot be silently changed after filing/audit.
- Add reversal/correction flow instead of direct mutation for posted documents.

Priority: High.

### 3. Receipt and Payment Allocations Are Manual

Current state:

- Receipt/payment allocation tabs accept document number, date, previous balance, allocated amount, and balance after allocation.
- The code calculates entry allocated/unallocated totals from typed allocation rows.
- There is no strong linkage from an allocation row to a sales/purchase entry id.

Gaps to fill:

- Add searchable open-invoice/open-bill picker for allocations.
- Persist linked document ids/uuids, not only document numbers.
- Auto-fill document date, document total, previous balance, and remaining balance.
- Prevent over-allocation unless explicitly allowed.
- Recalculate sales/purchase payment status from linked allocations.
- Handle allocation edits, deletes, and reversals safely.

Priority: High.

### 4. Stock Outward Is Not Fully Connected To Billing

Current state:

- Purchase receipt and stock ledger support intake, barcode/serial generation, verification, posting, and live balances.
- Delivery note exists as an outward document.
- Stock ledger has availability APIs and outward event names.

Gaps to fill:

- Wire sales submit to stock availability checks when products are stock-managed.
- Wire delivery note submit/post to reserve or consume stock.
- Add barcode/serial scan input to sales and delivery note where required.
- Prevent selling/delivering unknown, already consumed, wrong warehouse, or insufficient stock.
- Add outward movement posting and live balance reduction for sales/delivery note.
- Define return/reversal behavior for cancelled sales and delivery notes.

Priority: High for stock-enabled clients.

### 5. Document Number Sync Is Incomplete For Inventory Documents

Current state:

- Document number kinds include purchase receipt and delivery note.
- Purchase receipt and delivery note repositories consume `purchaseReceipt` and `deliveryNote`.
- Document number repository sync scans used numbers for sales, purchase, receipt, payment, cash book, and bank book.

Gap to fill:

- Add `purchaseReceipt` and `deliveryNote` to `usedDocumentNumbers()` so document settings preview/sync can advance past existing inventory documents.

Priority: Medium.

### 6. Reports Are Client-Side Aggregations

Current state:

- Statements and GST reports load full lists of sales/purchase/receipt/payment records into the frontend and aggregate there.
- Report filters are useful but limited.

Gaps to fill:

- Move large report aggregation to backend endpoints.
- Add pagination/export for large statements.
- Add PDF generation or print-render service for consistent output.
- Add aging buckets, outstanding-only filters, invoice-level allocation detail, and opening balance audit.
- Add GST filing reports beyond simple statement: GSTR-1 summary, purchase ITC view, HSN summary, B2B/B2C split, nil/exempt if needed.
- Queue heavy report generation and store generated files.

Priority: Medium.

### 7. Validation Needs More Domain Rules

Current state:

- Basic required fields exist: customer/supplier name, item defaults, amounts.
- Forms allow direct entry of many compliance/accounting values.

Gaps to fill:

- Validate GSTIN format and state-code match.
- Validate invoice dates against accounting year and period locks.
- Validate negative/zero quantities and rates by document type.
- Validate HSN and GST percentage consistency from product/tax masters.
- Validate round-off bounds.
- Validate vehicle number and transport GST when e-way is enabled.
- Validate party type: customer for sales/receipts, supplier for purchase/payments.

Priority: Medium.

### 8. Workflow Statuses Need Clear Semantics

Current state:

- Entries use statuses such as draft, posted, cancelled, paid/partial/unpaid.
- Statuses are mostly stored fields and UI labels.

Gaps to fill:

- Define status transitions per document type.
- Enforce transitions server-side.
- Add permissions for posting, cancelling, restoring, and editing posted entries.
- Ensure print/compliance generation only happens from allowed statuses.
- Add activity/audit events for every status transition.

Priority: Medium.

### 9. Billing Settings Are Sales-Heavy

Current state:

- Software settings include sales layout toggles for PO, DC, colour, size, e-invoice, e-way, print logo/account/QR.
- Purchase and inventory reuse some sales setting ids.

Gaps to fill:

- Split settings into shared billing layout, sales settings, purchase settings, inventory settings, and print template settings.
- Add industry presets for offset, garment, fabric trader, UPVC, ecommerce, and service billing.
- Make setting ids neutral where shared; avoid purchase code depending on `sales-use-*`.
- Add tenant/company/accounting-year scope decisions for each setting.

Priority: Medium.

### 10. Mail/WhatsApp/Tools Are Activity Stubs

Current state:

- Show pages have tool panels for email, WhatsApp, assign, attachments, tags.
- Tool actions generally record activity; actual sending/attachment storage is not complete in these billing pages.
- A mail module exists separately.

Gaps to fill:

- Connect billing documents to mail compose/send with generated PDF attachment.
- Persist uploaded attachments against document records.
- Add WhatsApp dispatch workflow or clearly mark it as activity-only until integrated.
- Queue sends and show delivery history.
- Add permissions and audit for sending documents.

Priority: Medium.

### 11. Data Model Needs Stronger Constraints

Current state:

- Main entry tables have unique document numbers in several modules.
- Child rows often have nullable uuid or no foreign-key constraints.
- Tenant/company/year context exists on main rows, but not consistently on child rows.

Gaps to fill:

- Make child row `uuid` consistently non-null where public references are possible.
- Add foreign keys or enforced repository checks for parent-child relationships.
- Add tenant/company/year indexes for reporting queries.
- Add consistency checks for item totals versus entry totals.
- Add migration/version tracking so schema changes are auditable.

Priority: Medium.

### 12. UX Needs A Few Billing-Specific Completion Passes

Current state:

- Sales/purchase item entry is feature-rich but large.
- Cash/bank voucher print is being actively refined.
- Receipt/payment allocations are simple grid rows.

Gaps to fill:

- Add open-document allocation picker in receipts/payments.
- Add better error messages from backend validation.
- Add save/post/cancel flows instead of one generic save.
- Add print copy selection for account vouchers if required.
- Add keyboard-first item entry improvements for repeated billing.
- Add responsive QA for all print templates at A4/A5 and browser print.

Priority: Medium.

## Suggested Work Order

1. Fix document-number sync for `purchaseReceipt` and `deliveryNote`.
2. Add receipt/payment allocation picker and linked document ids.
3. Define and enforce billing status transitions.
4. Add accounting posting foundation for sales, purchase, receipts, payments, cash and bank vouchers.
5. Wire stock outward checks/posting for delivery note and sales.
6. Split sales-heavy settings into shared billing/sales/purchase/inventory settings.
7. Replace e-invoice/e-way preview generation with gateway-ready service boundaries and persisted request/response logs.
8. Move reports to backend aggregation endpoints and add export/queued PDF path.
9. Connect billing documents to mail queue with PDF attachment.
10. Add validation and period-lock rules before production use.

## Immediate Quick Wins

- Add missing used-number scans for purchase receipt and delivery note in `DocumentNumberRepository`.
- Add a backend validation layer for GSTIN, state code, accounting year date range, and item totals.
- Add linked ids to receipt/payment allocations while keeping document number text for display.
- Add status transition helpers and disable edit for posted/cancelled entries until correction flow exists.
- Add a small backend report endpoint for customer/supplier outstanding so frontend no longer depends on full-list loading.

## Decision

Billing is not just a screen gap now; the screens are mostly present. The important next work is to make the current billing data behave like an accounting and compliance system: linked allocations, ledger postings, enforced statuses, stock movement, gateway-safe compliance, and backend reports. The UI can continue to be refined, but the biggest product risk is the missing posting/allocation/compliance foundation beneath the visible forms.
