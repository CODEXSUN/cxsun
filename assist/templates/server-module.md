# Server Module Template

Use this shape for new or expanded business modules under `apps/server/src/modules/<module-name>/`.

## Directory Layout

```
apps/server/src/modules/<module-name>/
├── domain/
│   ├── events/
│   └── <entity-or-value-object>.ts
├── application/
│   ├── dto/
│   └── <use-case>.ts
├── infrastructure/
│   └── database/
│       ├── migrations/
│       └── seeders/
├── interface/
│   └── <module-name>.controller.ts
├── <module-name>.module.ts
└── index.ts
```

## Placement Guide

- `domain/`: business entities, value objects, policies, and domain events.
- `application/`: use cases, DTOs, orchestration, and application services.
- `infrastructure/`: repositories, database adapters, external integrations, migrations, and seeders.
- `interface/`: HTTP controllers, WebSocket handlers, middleware, guards, and request/response adapters.
- `<module-name>.module.ts`: framework module registration.
- `index.ts`: public API only. Do not export internals that other modules should not consume.

## Rules

- Do not import another module's internals.
- Use public exports, application contracts, or events for cross-module behavior.
- Keep controllers thin. Put business behavior in application/domain code.
- Keep infrastructure code out of domain and application layers.
