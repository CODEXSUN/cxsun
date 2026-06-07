# SALES

## Summary
Sales invoice management system for recording sales transactions with line items, customer handling, tax calculations, and A4 tax invoice print with QR code and barcode.

## What We Done
- Sales invoice list with MasterListPageFrame (search, paginated grid, edit/delete)
- Sales invoice form with date, customer selection, items grid (product, quantity, rate, discount, tax), freight, loading charges
- Customer autocomplete with contact-role-filter
- Tax calculation (cgst/sgst/igst) with GST type support
- Round-off and net amount computation
- Tax invoice print layout with A4 template (letterhead, line items table, amount in words, TCS, tax summary, signature)
- Code128 barcode generation (sales-barcode.ts)
- Static QR code for GST portal link
- Line budgeting algorithm for print layout
- API client with typed request/response models
- Delete confirmation dialog

## Gaps
- No sales order → invoice workflow
- No delivery challan/challan-to-invoice conversion
- No sales return/credit note
- No customer payment tracking per invoice
- No shipment/delivery tracking
- No e-invoice/e-way bill integration
- No multi-currency sales
- No recurring invoice support
- No partial invoice fulfillment

## Future Concepts
- Sales order/quotation/proforma workflow
- Delivery challan generation and tracking
- Credit note/sales return processing
- E-invoice (IRN) and e-way bill API integration
- Recurring invoice automation
- Customer payment link sharing
- Sales analytics (revenue by product/customer/region)
- Multi-currency with exchange rate handling
