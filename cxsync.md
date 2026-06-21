# CXSync Admin

## Current Foundation

CXSync is a private desktop tenant-connection manager.

### Login

- Login is local to CXSync.
- Email and password come from `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` in the root `.env`.
- No portal call or connection-settings form appears on the login screen.

### Local Environment

CXSync automatically reads:

```text
DB_HOST
DB_PORT
DB_NAME
DB_USER
DB_PASSWORD
```

These server credentials are used only to create and connect to the dedicated `CXSYNC_DB_NAME` database. CXSync does not store its registry or analytics in the platform master database.

Default:

```text
CXSYNC_DB_NAME=cxsync_admin
```

The CXSync database owns:

- `cxsync_config`
- `cxsync_tenant_connections`
- `cxsync_handshake_history`
- `cxsync_analytics_snapshots`
- `cxsync_data_snapshots`
- `cxsync_schema_baselines`
- `cxsync_upgrade_plans`
- `cxsync_upgrade_preflights`
- `cxsync_tenant_backups`
- `cxsync_upgrade_executions`

### Tenant Connection Registry

After login, the first page lists tenant connection records.

Each record stores:

- tenant name, code, and corporate ID;
- local tenant database host, port, database, user, and protected password;
- cloud API URL and login domain;
- cloud tenant-admin email and protected password.

Passwords are encrypted with Windows credential protection through Electron `safeStorage`.

### Tenant Show and Handshake

The tenant show page displays local and cloud information and provides a Handshake action.

Handshake:

1. Connects to the configured local tenant MariaDB.
2. Reads the MariaDB server version.
3. Authenticates the tenant administrator against the configured cloud portal.
4. Reads the cloud backend health/version.
5. Compares the local CXSync application version with the cloud backend version.
6. Displays connection status, latency, versions, and mismatch state.
7. Saves each result as append-only handshake history.

### Cloud Snapshot

The tenant show page can capture a saved cloud-status snapshot through the configured backend API.

Cloud snapshot:

1. Authenticates the configured tenant administrator against `/api/v1/auth/login`.
2. Requires the cloud login response to return a backend session token.
3. Verifies the token against `/api/v1/auth/session`.
4. Reads `/health` for cloud status, uptime timestamp, and backend version.
5. Saves the result as a `cloud-status` record in `cxsync_data_snapshots`.
6. Shows whether cloud API login, session, and health checks are ready, partial, or failed.

This is an API visibility check only. It does not connect directly to the VPS database, does not read tenant business rows, and does not upload or repair cloud data. It prepares the safe path for future cloud schema/data snapshot endpoints that must be exposed by the authenticated backend.

### Tenant Inspection

The tenant show page can run a read-only local schema inspection.

Inspection:

1. Connects to the configured local tenant MariaDB.
2. Reads table metadata from `information_schema.TABLES`.
3. Reads column metadata from `information_schema.COLUMNS`.
4. Reads index metadata from `information_schema.STATISTICS`.
5. Shows table count, column count, index count, missing-primary-key count, row estimates, and storage usage.
6. Lists table name, engine, primary-key status, column count, index count, estimated rows, data size, index size, and update time.
7. Stores the inspection snapshot in the dedicated CXSync database.

This does not read tenant business rows, write to the tenant database, or write to the cloud.

### Schema Baseline and Diff

The tenant show page can capture either:

- a trusted local schema inspection as the active baseline;
- a codebase tenant migration inventory as the active baseline.

Schema diff:

1. Runs a fresh read-only local schema inspection.
2. Loads the active baseline from the dedicated CXSync database.
3. Compares tables, columns, indexes, primary keys, table engines, column types, nullability, defaults, and extra metadata.
4. Reports missing, extra, and changed objects with severity.
5. Stores the diff result in `cxsync_data_snapshots`.

Codebase baselines are built by running backend tenant migrations against an isolated short-named `cxsync_scratch_*` MariaDB database such as `cxsync_scratch_a1b2c3d4e5`. CXSync inspects its complete table, column, and index metadata, stores the baseline in `cxsync_admin`, and drops the scratch database in a `finally` cleanup. This path skips tenant seed data and all master-database metric updates.

Expected-schema building publishes live status to the Schema Diff tab, including current phase, exact current operation, elapsed time, scratch database name, MariaDB process state, latest tables created, recent runner output, and a short activity feed. The activity feed reports real operations such as creating a table, adding a column, modifying a column, updating an index, or dropping the scratch database rather than repeating generic table-count messages. This is intentionally visible because building the full tenant schema can take several minutes on MariaDB, especially while creating or dropping many tables. Interrupted scratch databases are cleaned before the next build. The default timeout is 10 minutes and can be adjusted with `CXSYNC_SCHEMA_BUILD_TIMEOUT_MS`.

To keep the workflow smooth, CXSync fingerprints backend tenant migration source files. If the migration source has not changed since the last codebase baseline for that tenant, CXSync reuses the cached expected schema immediately instead of rebuilding another scratch database. A full scratch build is only required after migration code changes or when no matching cached baseline exists. After a successful inspection, the baseline can be saved immediately while scratch database cleanup continues in the background; leftover scratch databases are also cleaned before the next full build.

This is report-only. It does not repair schema automatically.

### Upgrade Planning

After schema comparison, CXSync can generate a persisted draft upgrade plan. The plan orders critical differences first, classifies each step as safe, caution, or destructive, and includes review-only SQL suggestions where metadata is sufficient. Missing tables are routed back to their owning backend migration, while extra objects and destructive changes never receive executable SQL. Generating a plan performs a fresh comparison but does not alter the tenant database.

Upgrade preflight checks the active baseline, plan freshness, latest local/cloud handshake, version alignment, destructive steps, migration coverage, and MariaDB schema privileges. Reports are persisted, and execution remains blocked until a verified recovery backup is attached.

### Recovery Backups

CXSync creates plan-bound logical MariaDB backups through `mariadb-dump`/`mysqldump`, streams output directly to the private Electron user-data folder, calculates SHA-256 and file size, and restores every new dump into a disposable short-named `cxsync_restore_*` database. The restored schema fingerprint must exactly match the source schema before the backup receives `restore-verified` status; the disposable database is then dropped. Database passwords are supplied to child processes through their environment and never command-line arguments. Use `CXSYNC_MARIADB_DUMP_PATH` and `CXSYNC_MARIADB_CLIENT_PATH` when the dump and client executables are not in standard locations.

### Controlled Local Schema Execution

After a passing preflight and restore-tested backup, CXSync can execute only generated, allow-listed local schema statements. The executor accepts non-destructive `ALTER TABLE` statements, disables multi-statement execution, applies steps one by one, stops on the first SQL failure, and writes a persisted execution report to `cxsync_upgrade_executions`. Manual, missing-table, destructive, or unsupported statements are skipped and remain visible in the audit for maintainer action.

This execution engine updates only the selected local tenant database. It does not write tenant data to cloud, bypass backend APIs, or perform direct VPS database repair.

## Current Screens

```text
Local login
Tenant connection list
Add tenant connection
Tenant connection show / handshake
Handshake history
Cloud snapshot
Local tenant schema inspection
Schema baseline and diff
Draft upgrade plan
Controlled local schema execution report
Local environment status
```

No download, upload, cloud repair, or data synchronization engine is included in this foundation.
