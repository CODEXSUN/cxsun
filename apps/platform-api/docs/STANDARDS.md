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

## Event Standard

Use events for state changes that other services may care about.

Keep event names explicit:

```text
platform.tenant.created
platform.tenant.updated
platform.user.created
platform.rbac.policy.changed
```

Event payloads must include enough public identifiers for other services to react without reading private Platform tables directly.

Use `src/events.ts` for the initial in-process event shape. Move to a durable outbox/queue only when a workflow needs retries, delayed execution, fan-out, or cross-service delivery.

## Sync Tag Standard

Every future contract that may participate in online/offline behavior should declare sync tags from the start:

- `online-only`: normal cloud-only platform action.
- `offline-capable`: can be mirrored or replayed later.
- `mirror-evidence`: used for audit/mirror evidence rather than business mutation.

Use `src/sync-tags.ts` as the initial code-level source of truth.

## Queue Standard

Do not put every action into a queue. Use a queue only when work is:

- slow or retryable
- cross-service
- scheduled
- external-provider dependent
- fan-out notification/event delivery

MariaDB-backed queues are the default baseline. Redis/BullMQ can be enabled later for throughput, but no Platform API feature should require in-memory-only state.

## Module Shape

Use this shape for new Platform-owned modules:

```text
src/modules/<module>/
  <module>.module.ts
  <module>.module.md
  index.ts
```

Do not create deep folders for a single tiny file. Add `domain/`, `application/`, `infrastructure/`, and `interface/http/` when the module has enough behavior to need them.

Platform API must not import from `apps/server`. If shared behavior is needed, copy it into Platform API temporarily or promote it into an explicit shared package later.

## Documentation Standard

Every Platform-owned module must include a local `<module>.module.md` note from the start. When the feature is visible to users or support staff, also add a curated central docs page under `apps/docs/docs`.

Use `apps/platform-api/docs/MODULE-DOCS.md` as the source standard.

Documentation must move with each implementation stage. When a Platform API module gains routes, events, queues, sync tags, tables, tests, or boundary changes, update the local module doc and the central dev/client docs in the same stage.

Do not bump package versions for Platform API work unless the user explicitly asks for a version bump. Record normal progress in the latest current-version changelog entry instead.

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

For contract tests, use MariaDB. Do not use in-memory databases for Platform API behavior:

```bash
npm -w apps/platform-api run test:contract
npm -w apps/platform-api run test:smoke
```

For e2e tests, also use MariaDB and isolated cleanup:

```bash
npm -w apps/platform-api run test:e2e
```
