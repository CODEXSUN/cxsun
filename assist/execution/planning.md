# Session Plan

**Date:** 2026-05-24  
**Version:** 1.0.26  
**Focus:** Remaining stock ledger follow-up work.

## Objective

Finish the open stock ledger items that are not yet implemented or verified.

## Remaining Scope

### Barcode Label Verification

- Verify printed labels render the readable barcode text and scannable value correctly.
- Confirm label layout works for single-row print and multi-select print.

### Edited Serialization Handling

- Define how edited or revised serializations should be reversed or adjusted after stock has been posted.
- Add movement reversal/update behavior without mutating historical ledger records.

### Outward Stock Checks

- Add scan and availability checks before Sales submit.
- Add scan and availability checks before Delivery Note submit.
- Warn when a scan is unknown, already consumed, belongs to another product, belongs to another warehouse, or has insufficient quantity.
- On successful Sales or Delivery Note submit, add outward ledger movements and reduce live stock.

## Verification Needed

- Run server typecheck after backend changes.
- Run frontend typecheck after UI/client changes.
- Run frontend build after stock ledger or voucher UI changes.
- Smoke test the purchase receipt label print flow and outward scan warnings when those slices are implemented.
