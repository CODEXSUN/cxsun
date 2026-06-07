# ACCOUNTS

## Summary
Manages financial account ledgers (cash, bank, fixed assets) and book entries (cash books and bank books) with voucher tracking. Supports full CRUD operations on ledger accounts and entries, including soft-delete, restore, comments, and activity logging.

## What We Done
- Ledger management (cash, bank, fixed_asset) with auto-creation of default ledgers per tenant
- Cash book and bank book entry CRUD with voucher number auto-generation via document number settings
- Soft-delete and restore of entries with automatic ledger rebalancing
- Comments and activity tracking on entries (created, updated, deleted, restored, tool usage)
- Balance recalculation across entries for a ledger whenever an entry is mutated
- Migration from legacy `account_ledger_entries` table to split `cash_books`/`bank_books` tables
- Multi-tenant isolation via `TenantContextService`

## Gaps
- No fixed asset book entry management (only cash/bank book types are supported)
- No financial reporting or trial balance generation
- No ledger deletion endpoint (only upsert)
- No bulk entry operations
- No entry-level soft-delete for comments/activities
- No search/filtering on entry list queries

## Future Concepts
- Fixed asset book entries with depreciation tracking
- Trial balance, P&L, and balance sheet reports
- Ledger deletion and merge capabilities
- Bulk import/export of entries from spreadsheet formats
- Bank reconciliation against imported bank statements
- Audit trail reporting for compliance
