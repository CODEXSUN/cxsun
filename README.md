# cxsun

**Version:** 1.0.09

CXSun is a TypeScript monorepo for an ERP + ecommerce + multi-tenant platform. The current working application is a Node.js/Fastify backend paired with a React + Vite frontend using Tailwind CSS and shadcn-style UI primitives.

## Workspace Layout

```
cxsun/
├── apps/
│   ├── server/      # Active backend API
│   ├── frontend/    # Active React + Vite frontend
│   └── cli/         # Local workflow helpers
├── packages/
│   ├── shared/      # Shared types, constants, and pure utilities
│   ├── web/         # Reserved web package
│   ├── desktop/     # Reserved Electron package
│   └── mobile/      # Reserved Expo package
└── assist/          # AI agent rules, context, templates, and session tracking
```

Local SQLite storage is initialized at:

```text
storage/database/cxsun.sqlite
```

## Common Commands

```bash
npm run dev
npm run dev:server
npm run dev:frontend
npm run check
npm run typecheck:active
npm run build:active
```

Default local ports:

- Frontend: `6010`
- Backend: `6001`

## Active Development

- Backend work belongs in `apps/server`.
- Frontend work belongs in `apps/frontend`.
- Shared cross-workspace types, constants, and pure utilities belong in `packages/shared`.
- Reserved packages should stay typecheckable while minimal.
- Frontend styles belong under `apps/frontend/src/assets/css`.
- Backend persistence currently uses Kysely with SQLite.

## AI Assist

Before AI-assisted work, read:

- `assist/README.md`
- `assist/rules/`
- `assist/context/`

The assist system documents the current architecture, verification flow, workspace map, and server module template.
