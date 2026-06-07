# Accounts

## Summary
Cash and bank book management with ledger-based double-entry tracking, voucher creation, comments, activities, and print-ready documents.

## What We Done
- `accounts-book-page.tsx` — Full CRUD UI for cash/bank entries (`CashBookPage`, `BankBookPage`). List view with search across voucher no, party, ledger, reference, narration. Show view with print layout, comment thread, activity timeline, and entry tools (email, assign, attachments, tags, WhatsApp). Upsert view with ledger autocomplete (inline creation), party autocomplete, particulars, amount (decimal input), voucher no (auto-preview from `DocumentEntryKind`), date, direction (Received/Paid radio), status (draft/posted/cancelled), narration/notes tabs, and Save/Save & Print actions. Suspend/restore support.
- `accounts-client.ts` — API client: `listAccountLedgers`, `upsertAccountLedger`, `listAccountBookEntries`, `upsertAccountBookEntry`, `destroyAccountBookEntry`, `restoreAccountBookEntry`, `addAccountBookComment`, `runAccountBookTool`. Types: `AccountLedger`, `AccountBookEntry`, `AccountBookComment`, `AccountBookActivity`, `AccountBookEntryInput`.

## Gaps
- No ledger detail/edit page — only inline creation via autocomplete.
- No reconciliation or bank statement import.
- No period-locking or fiscal-year closure.
- No account hierarchy (groups/sub-groups beyond cash/bank/fixed_asset).
- Voucher printing limited to single-entry style; no formal invoice layout.
- Entry tools (email, assign, attachments, tags, WhatsApp) record activities but show no actual send/assignment logic in frontend.

## Future Concepts
- Ledger master page with opening/current balance editing and transaction drill-down.
- Bank reconciliation module with statement upload and matching UI.
- Multi-currency support per ledger.
- Account groups / chart of accounts hierarchy.
- Voucher types (payment, receipt, contra, journal, credit note, debit note).
- Period-end closing workflow with reversal support.
