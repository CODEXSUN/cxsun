# STOCK

## Summary
Stock/Inventory management module with inward, outward, and ledger views for tracking inventory movements across godowns and contacts.

## What We Done
- Contact-role filter utility for filtering contacts by customer/supplier role
- Subfeature structure: inward/, outward/, ledger/, shared/ directories established

### Inward (stock receipt)
- (source files pending deeper read)

### Outward (stock issue/delivery)
- (source files pending deeper read)

### Ledger (stock movement history)
- (source files pending deeper read)

### Shared
- (source files pending deeper read)

## Gaps
- Inward/outward/ledger pages not yet analyzed in detail
- No stock transfer between godowns
- No stock adjustment (physical count vs system)
- No batch/lot tracking
- No expiry date management
- No reorder level alerts
- No stock valuation reporting (FIFO, weighted average)
- No inventory aging analysis

## Future Concepts
- Godown/warehouse master management
- Stock transfer with in-transit tracking
- Physical stock counting with adjustment vouchers
- Batch and expiry tracking for perishable goods
- Reorder point automation with purchase order suggestion
- Inventory valuation reports (FIFO, LIFO, weighted average)
- Stock aging and slow-moving analysis
- Barcode/RFID-based stock entry
- Real-time stock dashboard
