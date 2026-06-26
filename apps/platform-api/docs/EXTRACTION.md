# Platform API Extraction Plan

Platform API is now a standalone deployable unit with local runtime/core/infrastructure and local foundation modules. The live combined backend remains available separately while callers migrate.

## Phase 1 - Scaffold

- Create `apps/platform-api`.
- Boot health, auth, tenant, tenant-domain, and industry only.
- Add separate port, docs, typecheck, build, and smoke scripts.
- Add MariaDB-backed contract tests from the start.
- Add event and sync-tag primitives before extracting business-facing contracts.
- Migrate `health`, `auth`, `tenant`, `tenant-domain`, and `industry` into native Platform API modules.
- Move framework/runtime, config, database, auth, queue, and tenant-database infrastructure into Platform API.
- Remove direct `apps/server` imports from Platform API source and tests.
- Keep all existing live routes in `apps/server`.

## Phase 2 - Own Runtime

- Promote duplicated framework/runtime pieces into a shared package only when reuse becomes stable.
- Move Platform-owned modules into `apps/platform-api/src/modules`.
- Keep compatibility exports in `apps/server` while callers migrate.

## Phase 3 - Stable Contracts

- Publish Platform API contracts for tenant, auth, RBAC, company, accounting year, mail, notification, files, and audit.
- Add service-token authentication for app-to-platform calls.
- Add contract tests for all public service APIs.

## Phase 4 - Deployment

- Add Docker/compose target for Platform API.
- Add Nginx/API routing rules.
- Deploy Platform API independently from Billing API and the old combined server.

## Stop Rule

Do not remove a module from `apps/server` until:

- Platform API typecheck passes.
- Platform API build passes.
- Contract and e2e tests pass against configured MariaDB.
- Existing combined server checks still pass.
- Frontend/API callers are migrated or a compatibility adapter exists.
