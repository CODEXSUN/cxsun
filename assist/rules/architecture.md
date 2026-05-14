# Application Architecture

## Overview

`cxsun` is an ERP + ecommerce + multi-tenant platform built as a TypeScript monorepo. The current working runtime is:

- Backend: `apps/server` (`@cxsun/server`), Node.js + Fastify with a custom decorator/bootstrap layer.
- Frontend: `apps/frontend` (`@cxsun/frontend`), React + Vite.
- Shared package: `packages/shared` (`@cxsun/shared`), for framework-free shared types, constants, and pure utilities.
- Workflow helpers: `apps/cli` (`@cxsun/cli`).

Reserved platform packages exist under `packages/` for future channels:

- `packages/web` (`@cxsun/web`) is a placeholder and is not the active Vite frontend.
- `packages/desktop` (`@cxsun/desktop`) is a minimal Electron placeholder.
- `packages/mobile` (`@cxsun/mobile`) is a placeholder Expo package.

## Monorepo Structure

```
cxsun/
├── .env                         # Root env vars, never commit secrets
├── .env.sample                  # Template with required vars
├── package.json                 # Workspace root and active scripts
├── tsconfig.base.json           # Shared TS config
├── apps/
│   ├── cli/                     # Local workflow scripts
│   ├── frontend/                # Active React + Vite app
│   │   ├── public/              # Static frontend assets
│   │   └── src/                 # Frontend source
│   └── server/                  # Active backend API
│       └── src/
│           ├── common/          # Shared backend guards, filters, middleware
│           ├── core/            # Custom framework bootstrap, decorators, DI
│           ├── infrastructure/  # Config, shutdown, and platform adapters
│           └── modules/         # Domain modules
├── packages/
│   ├── shared/                  # Types, constants, pure utilities only
│   ├── web/                     # Placeholder package
│   ├── desktop/                 # Placeholder Electron package
│   └── mobile/                  # Placeholder Expo package
└── assist/                      # AI agent rules, context, and docs
```

## Key Principles

- Active development targets `apps/server` and `apps/frontend` unless the user explicitly asks for a reserved package.
- The server owns business logic and exposes APIs consumed by clients.
- Client apps must not duplicate server-owned domain logic.
- `@cxsun/shared` must stay framework-free: types, constants, and pure utilities only.
- Keep apps deployable independently. Share through `@cxsun/shared`, APIs, and documented contracts.
- Multi-tenant behavior belongs in server-side middleware, infrastructure, and domain/application services.

## Backend Structure

The backend lives in `apps/server/src`.

```
apps/server/src/
├── main.ts
├── common/
│   ├── filters/
│   ├── guards/
│   └── middleware/
├── core/
│   ├── decorators/
│   ├── exceptions/
│   ├── interfaces/
│   ├── bootstrap.ts
│   └── container.ts
├── infrastructure/
│   ├── config.ts
│   └── shutdown.ts
└── modules/
    └── <module>/
        ├── domain/
        ├── application/
        ├── infrastructure/
        ├── interface/
        ├── <module>.module.ts
        └── index.ts
```

The current `health` module predates full DDD placement and still has flat controller/service files. For new or expanded business modules, prefer:

- `domain/` for entities, value objects, and domain events.
- `application/` for use cases, DTOs, and application services.
- `infrastructure/` for repositories, database code, external adapters, migrations, and seeders.
- `interface/` for HTTP controllers, WebSocket handlers, and request/response adapters.
- `index.ts` for the module public API.

Avoid direct cross-module imports. Use explicit public module exports, application contracts, or events where module boundaries are involved.

## Frontend Structure

The active frontend lives in `apps/frontend/src`.

Preferred growth pattern:

```
apps/frontend/src/
├── app/             # App shell, routing, providers
├── features/        # User-facing feature areas
├── components/      # Shared UI components
├── assets/          # App-owned visual assets
├── App.tsx
└── main.tsx
```

Keep UI feature code in `apps/frontend` until a separate reusable package is intentionally introduced.

## Cross-App Communication

```
frontend / future clients
          |
          | HTTP/WS
          v
apps/server
          |
          v
database / infrastructure

@cxsun/shared supplies shared types, constants, and pure utilities only.
```

## Environment Variables

Root `.env` feeds local development. Never commit real secrets.

- `VITE_*` is consumed by `apps/frontend`.
- `EXPO_PUBLIC_*` is reserved for `packages/mobile`.
- `ELECTRON_*` is reserved for `packages/desktop`.
- Server variables are consumed by `apps/server`.

Current default local ports:

- Frontend: `6010`
- Server: `6001`
