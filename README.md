# CXSun

**Version:** 1.0.131

CXSun is currently stabilized as a focused billing workspace: one Fastify backend, one React/Vite frontend, one shared utility package, and local CLI helpers.

## Active Shape

```text
cxsun/
|-- apps/
|   |-- cli/        # local workflow scripts
|   |-- frontend/   # React + Vite billing UI
|   `-- server/     # Fastify backend API
|-- packages/
|   `-- shared/     # framework-free shared types/utilities
|-- assist/         # project rules and working notes
`-- storage/        # local runtime storage
```

## Requirements

- Node.js 20+
- npm 10+
- MariaDB/MySQL for platform and tenant databases

## Setup

```bash
npm install
cp .env.sample .env
npm run dev
```

Update `.env` with your local database credentials before starting the server.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start server and frontend together |
| `npm run dev:server` | Start only the backend |
| `npm run dev:frontend` | Start only the frontend |
| `npm run typecheck:active` | Typecheck server, frontend, and shared package |
| `npm run build:active` | Build server and frontend into root `build/` |
| `npm run check` | Run active typechecks and builds |
| `npm run db:migrate` | Run server migrations |
| `npm run db:seed` | Seed server data |
| `npm run db:setup` | Setup database schema and seed data |

## Runtime

- Backend default port: `6005`
- Frontend default port: `6010`
- Frontend API target is read from the server dev-state file during local `npm run dev`, or from `VITE_API_BASE_URL` when set.

## Verification

Before finishing meaningful changes, run:

```bash
npm run check
```
