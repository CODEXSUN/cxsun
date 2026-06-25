# Platform API Extraction Plan

Platform API starts by importing selected foundation modules from `apps/server`. This keeps the live combined backend safe while the new deployable unit is prepared.

## Phase 1 - Scaffold

- Create `apps/platform-api`.
- Boot health, auth, tenant, tenant-domain, and industry only.
- Add separate port, docs, typecheck, build, and smoke scripts.
- Keep all existing live routes in `apps/server`.

## Phase 2 - Own Runtime

- Move or share the bootstrap/runtime layer without importing all of `apps/server`.
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
- Smoke test passes against configured MariaDB.
- Existing combined server checks still pass.
- Frontend/API callers are migrated or a compatibility adapter exists.
