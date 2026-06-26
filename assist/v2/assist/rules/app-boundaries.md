# App Boundary Rules

CODEXSUN is one codebase with separately deployable app containers.

## Planned app names

Use these canonical app names:

```text
platform
billing
ecommerce
sites
crm
taskmanager
auditor
tirupur-connect
```

Do not invent alternate names such as `tasks`, `site`, `tc`, or `b2b` without a decision record.

## App structure

Each app must use this structure:

```text
apps/<app-name>/
|-- framework/
|-- platform/
|-- <app-name>/
|-- api/
|-- web/
|-- worker/
|-- tests/
|-- docker/
|-- config/
|-- docs/
`-- <app-name>.md
```

`framework/` and `platform/` inside an app are app-local adapters/composition folders. Shared framework source stays at root `framework/`. Shared Platform contracts stay in packages or public Platform APIs.

## Deployment boundary

- Each app has its own container.
- Each app has its own port.
- Each app has its own environment file section.
- Each app has its own Dockerfile.
- Each app can deploy without rebuilding other app containers.
- Each app failure must not stop unrelated app containers.

## Communication boundary

- Apps communicate only through public APIs, events, queues, or sync contracts.
- No app imports another app internals.
- If ecommerce needs billing, ecommerce calls Billing API or uses a separately approved small internal billing capability.
- The decision to call Billing API or own a small billing capability must be recorded at that time.

## Tenancy and industry boundary

- Every app must be tenant-aware.
- Every app must be industry-aware.
- Tenant context and industry context must be explicit in API contracts.
- No app may assume a global tenant.
- No app may assume a single industry.
- Industry-specific behavior must be isolated behind contracts or configuration.

## Port naming rule

Every app must reserve ports by app name:

```text
PLATFORM_API_PORT
PLATFORM_WEB_PORT
BILLING_API_PORT
BILLING_WEB_PORT
ECOMMERCE_API_PORT
ECOMMERCE_WEB_PORT
SITES_API_PORT
SITES_WEB_PORT
CRM_API_PORT
CRM_WEB_PORT
TASKMANAGER_API_PORT
TASKMANAGER_WEB_PORT
AUDITOR_API_PORT
AUDITOR_WEB_PORT
TIRUPUR_CONNECT_API_PORT
TIRUPUR_CONNECT_WEB_PORT
```

Do not reuse ports across apps.
