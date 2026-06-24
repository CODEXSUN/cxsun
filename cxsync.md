# CXSync Admin

## Current Foundation

CXSync has two isolated modes:

1. **CXSync Maintenance Upgrade** is the private database maintenance, audit, full-data clone, migration rehearsal, verified backup, upload, and later controlled-cutover system for CXSun tenant databases. It exists to make delayed live deployments safe while application development continues daily.
2. **CXSync Mirror** is the separate online-to-offline office mirror mode. It connects an office local server to the VPS, bootstraps a dedicated local `cxmirror_*` database by full sync, then can manually pull incremental insert/update changes for eligible tables.

These modes must not share job tables, cursors, execution buttons, or safety assumptions. Maintenance Upgrade works with full database artifacts and approved release windows. Mirror works with scheduled incremental replication and local offline read availability.

The UI also keeps the modes separated by desk. The breadcrumb app switcher exposes **CXSync Sync** for maintenance, tenant checks, SQL dumps, diagnostics, and service-key work, and **CXSync Mirror** for online-to-offline mirror operations. Each desk owns its own side menu so Mirror execution controls are not mixed into the maintenance workflow.

CXSync Mirror is not the same as Maintenance Upgrade. Device activation, transaction outboxes, pull cursors, and business-record conflict handling remain outside Maintenance Upgrade, but belong to the separate Mirror roadmap once explicitly implemented. The original maintenance boundary remains recorded in `assist/context/cxsync-fleet-maintenance.md`.

## Mode Split

```text
CXSync
  -> Maintenance Upgrade
       -> cloud tenant inventory
       -> full cloud/local database clone
       -> candidate upgrade and verification
       -> restore-tested backup evidence
       -> upgraded artifact upload
       -> cutover/rollback later, never automatic

  -> Mirror
       -> office local server identity
       -> cloud-to-local incremental pull
       -> schedule window
       -> mirror jobs
       -> mirror cursors
       -> retry/resume/audit
       -> local offline read mirror
```

The first Mirror foundation owns isolated operational tables only:

```text
Cloud:
- cxsync_mirror_jobs
- cxsync_mirror_cursors

Desktop/local:
- cxsync_mirror_jobs
- cxsync_mirror_cursors
```

The current Mirror desk has two separate pages. **Mirror Sync** exposes manual full sync, one-tenant manual incremental pull, all-tenant full/incremental queues, top-level Start/Pause/Stop/Refresh controls, and per-tenant progress cards. **Mirror Settings** owns the daily schedule upsert form and enable/disable switch.

### Mirror Full Sync

The first Mirror function is **Full sync now** in the CXSync Desktop Mirror page. It is a manual cloud-to-local bootstrap for one saved tenant connection:

1. Desktop sends the tenant code/corporate ID to CXSync Cloud.
2. CXSync Cloud resolves the active tenant from the master registry and creates a full logical dump under `storage/cxsync/mirror/full`.
3. Desktop polls the protected Cloud dump job until completion.
4. Desktop downloads the dump into its private user-data mirror folder.
5. Desktop drops and recreates only the chosen local mirror database, normally `cxmirror_<tenantCode>`.
6. Desktop restores the dump into that mirror database.
7. Desktop verifies local table count and exact total row count against the Cloud dump evidence.
8. Desktop records the Mirror job and a `full-dump-sha256` cursor in its isolated Mirror tables.

This full sync is not incremental and does not schedule itself. It is the safe bootstrap step before incremental Mirror is used. Operators must keep the target database as a dedicated `cxmirror_*` database and must not point it at a working tenant database.

### Manual incremental Mirror pull

After a successful full mirror bootstrap, Desktop can run **Incremental sync now** for one tenant. Cloud returns rows from eligible tenant tables where:

- the table is a base table;
- the table has a single-column primary key;
- the table has an `updated_at` column;
- `updated_at` is newer than the saved per-table cursor.

Desktop upserts those rows into the matching local `cxmirror_*` database and saves the new per-table `updated_at` cursors in `cxsync_mirror_cursors` with cursor type `updated-at-json`.

Desktop can also run **Incremental all tenants**. It uses saved tenant connections serially, targets each tenant's `cxmirror_<tenantCode>` database, continues after item failure, and reports completed/failed counts.

Incremental safety hardening:

- incremental sync refuses to run until the selected `cxmirror_*` database has a verified `full-dump-sha256` bootstrap cursor;
- incremental cursor records save the real source cloud database name;
- incremental jobs persist recent history after restart;
- completed incremental jobs store summary evidence including source database, eligible table count, skipped table reasons, pulled table count, pulled row count, and page count;
- incremental pull pages until caught up, with `CXSYNC_MIRROR_INCREMENTAL_MAX_PAGES` as a safety cap;
- Desktop can export a Mirror audit JSON for a stored job through the Electron API.

Current incremental limits:

- it handles inserts, updates, and deletes when the cloud tenant database provides the explicit `cxsync_mirror_tombstones` outbox;
- delete propagation is never guessed from missing rows; when the tombstone outbox is absent, Mirror reports `missing-tombstone-outbox` and safely skips delete application;
- it does not migrate schema changes; run full sync again after schema changes;
- daily scheduling can run either full bootstrap or incremental pull depending on the selected schedule mode;
- tables without a single primary key and `updated_at` are skipped by design and reported with reasons.

Full sync hardening:

- Desktop refuses target database names that do not start with `cxmirror_`.
- Desktop persists job history, source/target database names, phase, cloud job ID, downloaded bytes, row count, table count, and final error.
- Cloud persists full-dump evidence and expiry metadata; default retention is 72 hours via `CXSYNC_MIRROR_FULL_DUMP_RETENTION_HOURS`.
- Verification compares every table row count, not only total rows.
- The Mirror page lists recent full-sync jobs after restart.

### Mirror Full-Sync Queue and Daily Schedule

Desktop Mirror can now run **Full sync all tenants**. It reads every saved tenant connection, runs one full-sync job at a time, stops only that item on failure, and continues to the next tenant. The queue remains local to the Desktop runtime and displays completed/failed counts plus item history and a progress bar.

The **Mirror Settings** page stores the daily all-tenant schedule. The scheduler is intentionally local and conservative:

- it runs only while CXSync Desktop is open on the office server;
- it can run either the safe full-sync queue or the incremental queue;
- it runs all saved tenant connections serially;
- it skips a scheduled run if another mirror queue is already active;
- it records the last run and next run in local CXSync config.

Full bootstrap is safest after schema changes. Incremental pull is the normal daily mirror option after every tenant has a successful full bootstrap.

## Service Split

CXSync now separates the private sync surface from the client billing backend.

```text
CXSync Desktop app
  -> tenant billing/admin backend for authenticated schema snapshots
  -> CXSync Cloud service for private handshake, tenant registry, and audit reports
  -> local tenant MariaDB for inspection, backup, and approved schema repair
```

Default private service:

```text
apps/cxsync-cloud
CXSYNC_CLOUD_PORT=6077
CXSYNC_CLOUD_PUBLIC_URL=https://cxsync.codexsun.com
```

The main billing backend continues to own tenant authentication and its read-only schema snapshot API. CXSync Cloud owns the separate private service handshake, master tenant registry, and audit report APIs. Local inspection, backup, comparison, and approved schema repair run only in Electron.

CXSync Cloud structure:

```text
apps/cxsync-cloud/src/connectors
apps/cxsync-cloud/src/engines
apps/cxsync-cloud/src/reporters
```

Run locally:

```text
npm run dev:cxsync-cloud
```

Useful endpoints:

```text
GET /health
GET /api/v1/cxsync-cloud/status
POST /api/v1/cxsync-cloud/admin/login
GET /api/v1/cxsync-cloud/admin/session
GET/POST /api/v1/cxsync-cloud/handshake
GET /api/v1/cxsync-cloud/tenants
GET/POST /api/v1/cxsync-cloud/reports
```

The tenant billing backend separately owns authenticated tenant visibility:

```text
POST /api/v1/auth/login
GET /api/v1/auth/session
GET /api/v1/cxsync/tenant-snapshot
```

The desktop-level CXSync Cloud service URL should point to this private service reverse-proxy domain:

```text
https://cxsync.codexsun.com
```

Each tenant connection's backend API URL points to the tenant billing/admin backend that owns `/api/v1/auth/login` and `/api/v1/cxsync/tenant-snapshot` (for example `http://127.0.0.1:6005` locally). Its login domain remains the tenant/company domain used for tenant resolution. Do not use desktop port `6044` or CXSync Cloud port `6077` as the tenant backend API URL.

For the first CXSync Cloud start, set one long bootstrap service key in the VPS `.env`:

```text
CXSYNC_SERVICE_KEY=long-random-secret
```

CXSync Cloud refuses to start unless this bootstrap key is configured and valid. The cloud browser uses a real super-admin login and an HttpOnly cloud-admin session. After login, **Cloud service key** can generate and activate a replacement key without rewriting `.env` or restarting Vite, Electron, or CXSync Cloud. Only the SHA-256 hash is persisted in `cxsync_cloud_config`; the raw generated key is shown for copying and must be pasted into Desktop.

CXSync Desktop includes a Service Key page in the side menu. Desktop does not generate the shared key. Paste the key generated by the cloud console and save it locally; the Electron runtime updates immediately and can handshake without restarting:

```text
CXSYNC_SERVICE_KEY=...
```

Recommended nginx shape:

```text
server_name cxsync.codexsun.com;
/api/ and /health -> http://127.0.0.1:6078
/                 -> http://127.0.0.1:6080
```

### Isolated Maintenance Deployment

Production CXSync maintenance runs separately from the live CXSun application. It owns container `cxsun-cxsync-maintenance`, image `cxsun:cxsync-maintenance`, workspace volume `cxsync-maintenance-workspace`, evidence volume `cxsync-maintenance-storage`, web host port `6080`, and API host port `6078`. Its entrypoint builds and starts only CXSync web and CXSync Cloud. It exits before the normal `db:setup`, tenant provisioner, Redis wait, backend, docs, and product-app startup paths. Maintenance mode also sets `CXSYNC_CLOUD_SKIP_PLATFORM_MIGRATIONS=true`, so Cloud verifies its master-database connection without running shared platform migrations or seeds; only CXSync-owned operational audit/batch tables are created as required.

The release must first be committed and pushed to the configured branch. Then deploy only the isolated maintenance service:

```bash
GIT_PULL_ON_START=true CXSYNC_EXPECTED_VERSION=1.0.128 \
  bash .container/setup-cxsync-maintenance.sh --reinstall
```

The command removes only the isolated maintenance workspace, checks the running release is exactly `1.0.128`, and confirms an already-running live `cxsun` container remains running. Initial deployment refuses clone-enabled or source-quiesced flags; it audits and prepares fleet operations without cloning until a separate approved canary window.

Stop only CXSync maintenance with:

```bash
bash .container/setup-cxsync-maintenance.sh --stop
```

Do not use `.container/setup-cloud.sh --reinstall` to install CXSync maintenance on a live older application. That command is the full CXSun application reinstall path and runs database setup and active-tenant provisioning.

### Fleet Clone Safety Gate

CXSync Cloud exposes fleet inventory and release-batch preparation while clone execution remains locked by default:

```text
CXSYNC_FLEET_CLONE_ENABLED=false
CXSYNC_FLEET_SOURCE_QUIESCED=false
CXSYNC_FLEET_DUMP_PATH=mariadb-dump
CXSYNC_FLEET_CLIENT_PATH=mariadb
```

An approved rehearsal window may temporarily set both `CXSYNC_FLEET_CLONE_ENABLED=true` and `CXSYNC_FLEET_SOURCE_QUIESCED=true` after tenant writes are stopped. Fleet preparation is canary-first, serial, and stop-on-failure. It creates full-data candidate databases and retains backup/evidence files under `storage/cxsync/fleet`; it does not update `tenants.db_name`, cut over production, delete the source database, or automatically delete failed candidates.

Clone work runs in the CXSync Cloud background after the protected request is accepted, so a large database is not tied to one browser request. If CXSync Cloud restarts during a clone, the persisted item and batch are marked failed on startup; retained backup/candidate evidence must be inspected before a new batch is prepared.

### Full SQL Dump

Desktop and Cloud expose the same **SQL dump** workspace. The operator enters MariaDB server credentials once; the list page discovers every visible user database while excluding `information_schema`, `mysql`, `performance_schema`, and `sys`. Opening a database shows its tables, estimated rows, and sizes.

The list provides database checkboxes and **Bulk dump in queue**. Selected databases run serially, one full dump at a time, with queued/running/completed/failed status, aggregate progress, completion ticks, and final paths. A failed database is recorded and the queue continues to the next selected database. The show page can queue its current database directly.

Each run uses `mariadb-dump`/`mysqldump` with a consistent transaction and includes the complete database schema and rows, routines, triggers, events, and binary values. The password is passed only through the child-process environment and is not saved or added to command arguments. Progress is updated from dump bytes, then the frontend shows a green completion tick and final file location.

Desktop opens the operating-system folder chooser and permits any selected local directory. Cloud accepts only a safe relative folder beneath:

```text
storage/cxsync/sql-dumps/<operator-folder>
```

Cloud storage is backed by the isolated `cxsync-maintenance-storage` volume. Output is written as `.sql.partial` and atomically renamed to `.sql` only after the dump process exits successfully and the file is confirmed non-empty.

Dump filenames use the compact database-based format `<database>-YYYY-MM-DDTHH.sql`, for example `cxsun_master-2026-06-24T04.sql`. A second dump of the same database within that hour will not overwrite the existing file.

### Cloud Diagnostics

The **Cloud diagnostics** page runs a small read-only Desktop-to-Cloud sequence before deployment or reinstall:

1. reach the public `/health` endpoint;
2. authenticate to the protected CXSync status API;
3. compare running, expected, and recorded database release versions;
4. test the master MariaDB connection and server version;
5. count active MariaDB tenants and detect missing/invisible tenant databases;
6. verify CXSync evidence-storage permissions and MariaDB dump/client tools;
7. report runtime isolation and fleet-clone safety-lock state.

Each check returns pass, warning, or fail with a focused corrective action. The endpoint redacts errors and never returns credentials. It performs no migration, seed, provisioning, clone, cutover, or database-write operation.

Useful fleet endpoints:

```text
GET  /api/v1/cxsync-cloud/fleet/tenants
GET  /api/v1/cxsync-cloud/fleet/batches
GET  /api/v1/cxsync-cloud/fleet/batches/:id
POST /api/v1/cxsync-cloud/fleet/batches
POST /api/v1/cxsync-cloud/fleet/batches/:id/clone-next
```

### Bounded Sync Job

CXSync Desktop now owns an auditable bounded sync workflow:

```text
get tenant database details
download cloud metadata snapshot
verify local vs cloud
prepare local migration plan when needed
verify after approved migration
upload audit report to CXSync Cloud
```

Boundaries:

- tenant business rows are not downloaded;
- CXSync Desktop does not write directly to VPS MariaDB;
- local schema migration is prepared as a reviewed plan and stops with `approval-required`;
- upload sends only the sync audit report to CXSync Cloud at `POST /api/v1/cxsync-cloud/reports`.

When a migration is needed, the first schema run stops at `approval-required`. The maintainer then reviews the Upgrade Plan tab, creates a restore-tested backup, runs preflight, and executes approved local steps. After that, the Schema Sync tab can continue the same job to verify local/cloud metadata again and upload the final audit report. CXSync Cloud persists received reports in `cxsync_cloud_reports`.

The Schema Sync tab also provides service reachability checks, job history, retry for failed jobs, and sanitized JSON report export from the local CXSync user-data folder. CXSync Cloud resolves the report tenant against its master tenant registry and treats `(tenant, jobId)` as idempotent, so a retry returns the original report instead of creating a duplicate. It synchronizes schema evidence and audit reports only; business-row synchronization is not implemented.

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
5. Calls `/api/v1/cxsync/tenant-snapshot` with the same tenant session token.
6. The cloud backend resolves the tenant context and reads metadata from that tenant cloud database.
7. The backend returns table, column, index, row-estimate, size, missing-primary-key, and schema-hash metadata.
8. CXSync saves the result as a `cloud-status` record in `cxsync_data_snapshots`.
9. Shows whether cloud API login, session, health, and tenant schema snapshot checks are ready, partial, or failed.

This is an API visibility check only. It does not connect directly to the VPS database, does not read tenant business rows, and does not upload or repair cloud data. Cloud metadata is exposed only through the authenticated backend so tenant isolation, auth checks, and audit boundaries stay in place.

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

CXSync Desktop never compiles or runs backend source migrations at runtime. The release process exports the reviewed expected schema to `apps/cxsync/electron/resources/expected-schema-manifest.json`; the installer packages that immutable manifest and verifies its content hash before using it. After migration code changes, regenerate and review the manifest with `npm -w apps/cxsync run generate:expected-schema` before building the release.

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

No business-row download/upload, cloud repair, or business-data synchronization engine is included in this foundation.

## Verification

Run the local contract and compile checks:

```text
npm -w apps/cxsync-cloud run test:contract
npm -w apps/cxsync-cloud run typecheck
npm -w apps/cxsync run typecheck
npm -w apps/cxsync run compile:electron
```

With CXSync Cloud running and a real master tenant available, run the service-key-protected integration smoke:

```text
$env:CXSYNC_SERVICE_KEY="..."
$env:CXSYNC_TEST_CORPORATE_ID="..."
$env:CXSYNC_TEST_TENANT_CODE="..."
npm -w apps/cxsync-cloud run test:integration
```

The integration smoke verifies Cloud status, Desktop handshake persistence, report persistence, retry idempotency, and report listing. The next product phase is all-tenant full-data clone and migration rehearsal on CXSync Cloud, never business-row push/pull.

With CXSync Cloud running and MariaDB client tools available, run the Mirror full E2E smoke:

```text
npm -w apps/cxsync-cloud run test:mirror-e2e
```

The Mirror E2E smoke selects a real active tenant, asks CXSync Cloud to create a protected full dump, downloads it, restores it into a disposable local database named `cxmirror_e2e_*`, verifies every restored table row count against Cloud evidence, runs a small incremental pull/upsert check, and drops the disposable database unless `CXSYNC_MIRROR_E2E_KEEP_DB=true` is set.

Optional delete outbox contract for tenant databases:

```sql
CREATE TABLE cxsync_mirror_tombstones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  table_name VARCHAR(191) NOT NULL,
  primary_key VARCHAR(191) NOT NULL,
  primary_key_value VARCHAR(500) NOT NULL,
  deleted_at DATETIME(3) NOT NULL,
  KEY idx_cxsync_mirror_tombstones_cursor (deleted_at, table_name, primary_key_value)
) ENGINE=InnoDB;
```

Application delete paths or reviewed triggers must insert one row into this outbox before/when deleting a source row. CXSync Cloud reads only tombstones newer than the saved delete cursor and Desktop applies matching deletes to the local `cxmirror_*` database.

### Verified Schema-Safety Drill

The 1.0.127 operator drill completed against an isolated 160-table schema clone while leaving the real tenant database untouched:

1. removed one nullable column from the disposable clone;
2. detected exactly one local/cloud difference;
3. generated one safe `ADD COLUMN` plan step;
4. created a 160-table logical backup and restore-verified its schema hash;
5. passed upgrade preflight with zero blockers;
6. applied one allow-listed statement with zero skipped or failed steps;
7. verified zero remaining differences;
8. uploaded and confirmed the final audit report in CXSync Cloud;
9. restored the connection to the real tenant database and removed the disposable clone.

The packaged application version is injected from `apps/cxsync/package.json` during the Vite build so the Desktop shell and installer release cannot silently display different versions.
