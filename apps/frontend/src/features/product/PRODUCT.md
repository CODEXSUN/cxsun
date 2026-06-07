# PRODUCT

## Summary
Product master data management with CRUD operations, integrated with master-data service. Supports listing, searching, creation, editing, and deletion of products within the MasterListPageFrame UI pattern.

## What We Done
- Product list page with MasterListPageFrame (search, paginated grid, edit/delete actions)
- Product creation/editing via MasterDataRecord dialog with fields for name, code, unit, hsnCode, taxRate, openingStock, price, description, godown, etc.
- API calls via apiBaseUrl + authHeaders for CRUD
- Search/filter by name or code
- Paginated data grid with delete confirmation

## Gaps
- No bulk import/export functionality
- No product category/tag management
- No image upload for products
- No MRP/batch/expiry date tracking
- No barcode generation or scanning
- No stock valuation display on product list
- No product variants (size/color)
- No low-stock threshold configuration at product level

## Future Concepts
- Barcode label printing
- Product image gallery
- Category tree with hierarchical browsing
- Variant management (multiple SKUs per product)
- Batch/lot tracking with expiry management
- Product import/export via CSV/Excel
- Stock history per product
- Reorder level alerts per product
