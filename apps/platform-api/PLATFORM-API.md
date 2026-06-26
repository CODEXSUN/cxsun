# Platform API

Platform API is the first standalone backend extraction from the current combined backend.

## Naming

Use **Platform API** for the deployable service name.

Use **core** for internal framework/foundation code.

Reason:

- `core` is clear for engineers inside the codebase.
- `platform-api` is clearer as a container, process, log name, and deployment unit.
- Business apps such as Billing, Ecommerce, CRM, and Sites can depend on Platform API without confusing it with their own internal core folders.

## Current Scope

This service starts narrow and owns its framework/runtime, config, database, auth, queue, tenant-database connector, and foundation modules locally under `apps/platform-api`.

Included first:

- Health
- Auth
- Tenant records
- Tenant domains
- Industry records
- RBAC policies and tenant policy toggles
- Tenant company/accounting-year context
- App registry and tenant app enablement
- Service-token contract
- Audit, notification, mail, and file metadata contracts
- Durable MariaDB queue/outbox processing endpoint

Not included yet:

- Billing entries
- Ecommerce
- CRM
- Sites
- CXSync
- Tirupur Connect marketplace business workflows
- Tenant business app schema provisioning

## Standalone Rule

Do not import from `apps/server` inside Platform API. The combined backend remains a separate compatibility runtime until Platform API and Billing API are both proven, but Platform API should evolve as its own deployable service.

The current goal is stable standalone startup and verification before extracting Billing API.

## Standards

Read these before adding Platform API behavior:

- `apps/platform-api/docs/STANDARDS.md`
- `apps/platform-api/docs/CONTRACTS.md`
- `apps/platform-api/docs/EXTRACTION.md`
- `apps/platform-api/docs/MODULE-DOCS.md`
- `apps/platform-api/docs/OPENAPI.md`

## Frontend Connection

Use this env value when the frontend should call Platform API separately:

```env
VITE_PLATFORM_API_BASE_URL=http://localhost:6105
```

`VITE_API_BASE_URL` remains the combined backend / business API base during the transition. If `VITE_PLATFORM_API_BASE_URL` is omitted, platform-owned frontend clients fall back to `VITE_API_BASE_URL`.
