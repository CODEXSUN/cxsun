# Architecture Rules

## Repository shape

```text
CODEXSUN/
|-- apps/
|   |-- platform/
|   |-- billing/
|   |-- ecommerce/
|   |-- sites/
|   |-- crm/
|   |-- taskmanager/
|   |-- auditor/
|   `-- tirupur-connect/
|-- framework/
|-- packages/
|-- docs/
|-- assist/
|-- tools/
|-- scripts/
`-- docker/
```

## Ownership

- `framework` owns runtime primitives only.
- `packages/contracts` owns shared DTOs and route contracts.
- `packages/config` owns typed environment loading.
- `packages/testing` owns test utilities.
- `packages/events` owns shared event contracts.
- `packages/queue` owns shared queue contracts.
- `packages/sync` owns shared sync contracts.
- `packages/ui` owns UI primitives.
- `apps/platform/api` owns Platform backend behavior.
- `apps/platform/web` owns Platform UI behavior.

## Growth rule

Future apps must be separately runnable, testable, buildable, and deployable.

One app must not import another app internals.

## Standard app shape

Each app must follow:

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

Inside each app:

- `framework/` contains app-local runtime composition.
- `platform/` contains app-local Platform API/client integration.
- `<app-name>/` contains the app-owned domain modules.
- `api/`, `web`, and `worker` are deployable units.

## Tenant and industry rule

Every app must be tenant-aware and industry-aware from the first contract. Tenant and industry context must be explicit, validated, and passed through public APIs or messages.
