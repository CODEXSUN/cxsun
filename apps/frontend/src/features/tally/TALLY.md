# TALLY

## Summary
Tally ERP integration workspace for synchronizing data between the application and Tally. Provides settings configuration and sync job management.

## What We Done
- Tally integration page with settings and sync job views
- Tally settings form (connection parameters, sync preferences)
- Sync job list with status tracking, retry, and details
- API client for tally settings (save/fetch) and sync job management (list, create, retry, get details)
- Navigation via nested route under tally section

## Gaps
- No actual sync mapping UI (which masters/transactions to sync)
- No sync schedule configuration (cron/interval)
- No sync conflict resolution UI
- No sync log/error detail viewer
- No test connection button for Tally connectivity
- No data push/pull preview before sync
- No unidirectional/bidirectional sync toggle
- No master data reconciliation display

## Future Concepts
- Sync mapping configuration (map product fields, account fields, etc.)
- Scheduled sync with interval/cron configuration
- Sync conflict resolution with diff viewer
- Detailed sync log with error troubleshooting
- Test connection with Tally
- Sync preview (what will be pushed/pulled before execution)
- Master data comparison and reconciliation report
- One-click full sync vs incremental sync modes
