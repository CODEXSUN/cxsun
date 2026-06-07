# RECEIPT

## Summary
Receipt/voucher entry management for recording financial receipts (payments received) with allocation to invoices or as on-account payments.

## What We Done
- Receipt entry list with MasterListPageFrame (search, paginated grid, edit/delete)
- Receipt form with date, customer selection, payment mode (cash/bank), voucher type
- Allocation grid: allocate receipt amount against outstanding invoices or on-account
- Unallocated amount display and validation
- Customer autocomplete filtering
- API client with typed request/response models
- Delete with confirmation dialog

## Gaps
- No payment out (payment voucher) — only receipt in
- No bank reconciliation
- No receipt print/preview
- No cheque/bank detail capture (cheque no, date, drawee bank)
- No multi-currency receipts
- No receipt against multiple customers
- No payment gateway/web payment integration

## Future Concepts
- Payment voucher (expense/payment out) support
- Bank reconciliation module
- Cheque management (cheque printing, deposit tracking)
- Receipt printing with bank details
- Daybook/cash/bank summary report
- Online payment gateway integration
- Automated receipt matching with bank statements
