# Platform API Standards

Platform API is the shared foundation service for all deployable business apps.

## Naming Standard

- Workspace: `apps/platform-api`
- Package: `@cxsun/platform-api`
- Runtime env port: `PLATFORM_API_PORT`
- Service name in logs/docs: Platform API
- Internal foundation layer name: core
- Tenant table prefix for platform-owned tenant tables: `core_`

Do not rename the deployable service to `core-api`. `core` is an internal code/layer concept, while Platform API is the service boundary.

## Service Responsibility

Platform API owns shared, business-neutral capabilities:

- auth and session validation
- tenant resolution
- tenant domains
- users
- companies and accounting years
- RBAC and app enablement
- mail delivery contracts
- notifications
- files/media references
- audit logs
- shared platform settings

Platform API must not own Billing, Ecommerce, CRM, Sites, or CXSync business records.

## Dependency Direction

Allowed:

```text
billing-api -> platform-api
ecommerce-api -> platform-api
crm-api -> platform-api
sites-api -> platform-api
```

Not allowed:

```text
platform-api -> billing-api
platform-api -> ecommerce-api
platform-api -> crm-api
platform-api -> sites-api
```

Platform API can publish contracts and events. It should not import app internals.

## Module Shape

Use this shape for new Platform-owned modules:

```text
src/modules/<module>/
  domain/
  application/
  infrastructure/
  interface/http/
  <module>.module.ts
  index.ts
```

During transition, Platform API may import selected existing modules from `apps/server`. That is temporary compatibility, not the final structure.

## API Rules

- Keep routes under `/api/v1/...` unless a health or internal diagnostic route already has a stable path.
- Use explicit DTOs and response contracts.
- Do not return persistence rows directly from controllers.
- Do not expose numeric internal IDs in public APIs when a public UUID exists.
- Service-to-service APIs must use signed tokens or dedicated service credentials before production deployment.

## Database Rules

- Master/platform database remains configured by `DB_*`.
- Tenant-local Platform-owned tables use `core_*`.
- New application-owned tables still use:

```sql
id INT AUTO_INCREMENT PRIMARY KEY,
uuid CHAR(8) NOT NULL UNIQUE
```

- Do not create `billing_*`, `ecommerce_*`, `crm_*`, or `sites_*` tables from Platform API.

## Verification Standard

For Platform API changes:

```bash
npm run typecheck:platform-api
npm run build:platform-api
```

When a configured MariaDB is available:

```bash
npm -w apps/platform-api run test:smoke
```
