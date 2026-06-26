# Platform API Contracts

This document lists the intended contract surface for future app services.

## Current Scaffold Surface

The current standalone surface exposes native Platform API foundation modules:

- `GET /health`
- `POST /api/v1/auth/login`
- tenant APIs from the native Tenant module
- tenant-domain APIs from the native Tenant Domain module
- industry APIs from the native Industry module
- RBAC, company/accounting-year, app registry, service token, audit, notification, mail request, file metadata, and queue processing APIs from the native Platform Foundation module

The current surface runs from `apps/platform-api` without direct `apps/server` imports. Treat the routes as internal foundation contracts until the service-token and OpenAPI contract work is complete.

## Contract Tests

Platform API contract tests must use MariaDB. Do not use in-memory databases for Platform API behavior.

Run:

```bash
npm -w apps/platform-api run test:contract
```

The contract suite must cover:

- `/health` service readiness.
- Real MariaDB connectivity.
- Native route registration for Platform API-owned modules.
- Safe unauthenticated behavior for public/session/context endpoints.
- Forbidden guard behavior for protected Auth, Tenant, Tenant Domain, Industry, and user-management routes when credentials are missing.

Do not add mutating contract tests unless they create isolated test data and clean it up in the same run.

## E2E Tests

Platform API e2e tests exercise full HTTP flows against MariaDB and must clean up their own rows.

Run:

```bash
npm -w apps/platform-api run test:e2e
```

The e2e suite covers:

- temporary super-admin seed and real `/api/v1/auth/login`.
- `/api/v1/auth/session` with a real bearer token.
- protected admin route access.
- Industry create, list, suspend, and restore.
- Tenant create, setup status, and context resolution with Platform-owned tenant core tables only.
- Tenant Domain create, resolve, and force delete.
- RBAC policy creation, tenant policy enablement, and policy checks.
- Tenant company and accounting-year reads after tenant core provisioning.
- App registry, tenant app enablement, service-token creation/verification, audit, notification, mail request, file metadata, and durable queue processing.
- User-management guard behavior remains covered by the non-mutating contract suite because tenant user summary scans all tenant databases.

E2E tests must use unique `cxsun_e2e_*` markers and remove test rows in `finally`.

## Future Stable Contracts

Billing, Ecommerce, CRM, Sites, and other app services should depend on Platform API for:

- Validate session/service token
- Resolve tenant by host/domain/code
- Read tenant app enablement
- Read user identity and role
- Check RBAC policy
- Read company/accounting year context
- Send mail through a platform-owned contract
- Create notification
- Store/read file metadata
- Write audit event

## Contract Rule

When a business service needs shared platform data, add or use a Platform API contract. Do not read Platform-owned tables directly from the business service unless a temporary migration note explicitly allows it.

Contracts that can affect offline/online reconciliation must include a sync mode in their design notes before implementation.

## Response Rule

Prefer small, typed responses for service-to-service calls. Example shape:

```json
{
  "ok": true,
  "tenant": {
    "code": "aaran",
    "status": "active"
  }
}
```
