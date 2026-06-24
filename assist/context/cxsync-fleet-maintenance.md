# CXSync Fleet Database Maintenance Boundary

## Canonical Purpose

CXSync is the private database maintenance, audit, clone, migration, and controlled-upgrade system for CXSun tenant databases.

It exists because application development happens continuously while live deployments happen in deliberate release windows. Before a release reaches live tenants, CXSync must prove that every existing tenant database can move from its current shape to the reviewed release shape without losing tenant data.

CXSync is not an offline billing-data synchronization product. Do not add device activation, business-record outboxes, pull cursors, billing conflict resolution, or customer transaction synchronization to CXSync.

## Trusted Boundaries

- CXSync Desktop is the private operator approval and evidence console.
- CXSync Cloud is the VPS-side trusted execution boundary for fleet inventory, full-data clone preparation, migration rehearsal, verification, and audit evidence.
- The tenant billing backend owns ordinary authenticated tenant metadata snapshots.
- Desktop must never connect directly to VPS MariaDB.
- Database credentials remain server-side and must never be returned by fleet APIs or written into audit payloads.

## Blue-Green Upgrade Rule

For every tenant selected in a release batch:

1. inventory the registered source database and confirm it is reachable;
2. take a consistent full-data logical backup;
3. restore it into a batch-owned candidate database on the same database host;
4. capture exact source table counts and schema evidence;
5. run the reviewed tenant migration code against the candidate only;
6. validate candidate schema, retained table counts, migration version, and invariants;
7. mark the tenant ready or failed with immutable evidence;
8. stop the batch on the first failure;
9. rehearse one canary tenant before preparing the remaining tenants serially;
10. perform production cutover only through a separate explicitly approved operation while retaining the original database as the rollback target.

The current preparation phase must not switch `tenants.db_name` and must not modify the source tenant database.

## Fleet Safety Defaults

- cloning is disabled unless `CXSYNC_FLEET_CLONE_ENABLED=true` is set on CXSync Cloud;
- one tenant at a time; no parallel fleet migration;
- first active tenant is the canary unless the operator chooses another tenant;
- candidate database names are deterministic, batch-owned, identifier-safe, and never equal the source name;
- every batch and tenant item is persisted before execution;
- repeated prepare requests use an idempotency key;
- failed batches stop and require operator review;
- no automatic production cutover or automatic deletion of source/candidate databases;
- secrets and tenant business rows never appear in HTTP responses or logs.

## Deferred Work

Installation testing on a separate clean Windows workstation is deferred. Business-data synchronization is permanently outside CXSync scope unless this canonical boundary is explicitly changed again.
