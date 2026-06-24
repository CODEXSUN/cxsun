# CXSync Admin

CXSync is a private Electron application for managing tenant database connections.

The SQL Dump page is shared by Desktop and Cloud. It discovers the live table inventory, requires every table to remain checked, creates a complete MariaDB dump, shows progress, and reports the final local or Cloud-storage path after completion.

## Current flow

1. Sign in locally using `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` from the root `.env`.
2. CXSync uses `DB_HOST`, `DB_PORT`, `DB_USER`, and `DB_PASSWORD` to create/connect the separate `CXSYNC_DB_NAME` database (`cxsync_admin` by default). It does not store CXSync records in `DB_NAME`.
3. Add tenant connection records containing local tenant database and cloud portal information.
4. Open a tenant record and run a handshake.
5. CXSync verifies the local tenant MariaDB, authenticates the cloud tenant admin, checks cloud health, and compares the local CXSync version with the cloud backend version.
6. Schema upgrade preparation creates a plan-bound backup and restores it into a disposable database before preflight can pass.
7. Controlled execution applies only allow-listed local schema statements and stores the audit in `cxsync_upgrade_executions`.
8. Completed schema-sync audit reports are uploaded to the private CXSync Cloud service at `/api/v1/cxsync-cloud/reports`; tenant billing backends remain snapshot-only.

Tenant database and cloud credentials are stored per connection. Passwords are encrypted using Electron `safeStorage`.

If MariaDB command-line tools are not installed in a standard folder, configure `CXSYNC_MARIADB_DUMP_PATH` and `CXSYNC_MARIADB_CLIENT_PATH` in the root `.env`.

## Development

```powershell
npm run dev:cxsync
```

The renderer runs on port `6044`.

## Verification

```powershell
npm -w apps/cxsync run typecheck
npm -w apps/cxsync run build:web
npm -w apps/cxsync run compile:electron
npm -w apps/cxsync-cloud run test:contract
```
