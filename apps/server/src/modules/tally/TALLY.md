# TALLY

## Summary
Integration module for synchronizing data with Tally ERP. Manages connection settings, sync job creation, and tracking of sync items across sales, purchase, receipt, payment, inventory, and contact modules.

## What We Done
- Tally connection settings management (host, port, company name, sync direction)
- Configurable module-level sync toggles (sales, purchase, receipt, payment, inventory, contacts)
- Sync job creation with status tracking (queued, processing, completed, failed)
- Sync item tracking per job with record-level status and error messages
- Auto-creation of default Tally settings per tenant on first access
- Workspace endpoint returning settings, recent 50 jobs, and items for latest job
- Queue event publishing on sync job creation

## Gaps
- No actual Tally XML/API communication implemented (sync jobs are created but not processed)
- No sync worker to execute queued jobs
- No data mapping or transformation logic
- No import (Tally-to-system) direction implementation beyond config
- No error handling or retry mechanism for sync failures
- No sync history/performance reporting
- No validation of Tally connectivity (no test-connection endpoint)

## Future Concepts
- Tally XML request builder for reading/writing ledger, voucher, inventory data
- Sync worker with XML-over-HTTP communication to Tally
- Bidirectional sync with conflict resolution
- Sync scheduling (periodic, daily, on-demand)
- Import of masters (ledgers, stock items, VAT/GST details) from Tally
- Sync dashboard with real-time progress, logs, and error resolution
- Field-level mapping configuration UI
- Automated reconciliation between system and Tally balances
