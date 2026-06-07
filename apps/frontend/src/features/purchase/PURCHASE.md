# PURCHASE

## Summary
Purchase entry management system for recording purchase transactions with line items, supplier handling, tax calculations, and print-ready A4 invoice generation.

## What We Done
- Purchase entry list with MasterListPageFrame (search, paginated grid, edit/delete)
- Purchase entry form with date, supplier selection, items grid (product, quantity, rate, discount, tax), freight, loading charges
- Supplier autocomplete (customer/supplier filter via contact-role-filter)
- Tax calculation (cgst/sgst/igst based on gstType)
- Round-off and net amount computation
- Print layout with A4 template (letterhead, line items table, amount in words, TCS, tax summary)
- Line budgeting algorithm for print layout
- API client with typed request/response models
- Delete confirmation dialog

## Gaps
- No purchase order workflow (PO → GRN → Invoice)
- No partial receipt against purchase
- No purchase return/debit note
- No payment tracking against purchases
- No landed cost allocation
- No supplier balance/credit limit check
- No batch-wise purchase tracking
- No purchase approval workflow

## Future Concepts
- Purchase order generation and tracking
- Goods receipt note (GRN) with inspection
- Purchase return and debit note processing
- Supplier payment scheduling and tracking
- Landed cost distribution across items
- Multi-currency purchase support
- Purchase analytics (spend by supplier/product)
