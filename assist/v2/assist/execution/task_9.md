# TASK 9 - Backend Runtime Tech Pack And Preflight

Execute this task after Task 8 is complete.

Do not create business tables, business forms, or business workflows in this task.

## Objective

Complete the backend runtime tech pack for CODEXSUN and standardize service startup.

Every app container must start through a safe preflight that checks required environment values, verifies the database when needed, checks the target port, kills only the process using that exact owned development port, and then starts the service on the same port.

## Boundary

Allowed:

- root package scripts
- backend package installation
- app preflight files
- framework server startup helpers
- logging setup
- database connection setup
- queue connection setup
- mail transport setup
- e2e package setup

Not allowed:

- business modules
- business migrations
- business seeders
- app-specific routes beyond health/status
- production process manager decisions

## Stage 1 - Root process runner

Install root process runner:

```text
concurrently
```

Root scripts must run services from the base workspace.

Example script names:

```json
{
  "dev:platform": "concurrently -k -n platform-api,platform-web \"npm -w apps/platform/api run dev\" \"npm -w apps/platform/web run dev\"",
  "dev:all": "concurrently -k -n platform \"npm run dev:platform\""
}
```

Rules:

- [ ] Use `concurrently` only at orchestration boundaries.
- [ ] Do not hide app startup inside unclear shell chains.
- [ ] Every app must still have its own `dev`, `build`, `start`, and `check` scripts.
- [ ] Use clear process names.
- [ ] Use kill-on-fail behavior for local development stacks.

## Stage 2 - Backend runtime packages

Install approved backend runtime packages:

```text
@fastify/cors@^11.2.0
fastify@^5.8.5
kysely@^0.29.0
mysql2@^3.22.3
bullmq@^5.77.3
ioredis@^5.10.1
nodemailer@^8.0.10
playwright@^1.60.0
```

Install approved backend development packages:

```text
pino-pretty
@types/nodemailer@^8.0.0
```

Rules:

- [ ] Fastify must be used behind the framework HTTP adapter.
- [ ] App modules must not import Fastify directly unless they are infrastructure adapters.
- [ ] Kysely must be the database query layer.
- [ ] `mysql2` must be the MariaDB driver.
- [ ] BullMQ must be the queue engine.
- [ ] ioredis must be the Redis client.
- [ ] Nodemailer must be behind a mail adapter.
- [ ] Playwright must be available for e2e testing.

## Stage 3 - Fastify server standard

Create shared server startup helpers in the framework package.

Required behavior:

- [ ] Build Fastify instance through a framework factory.
- [ ] Register CORS from config.
- [ ] Register health route.
- [ ] Register readiness route.
- [ ] Register request id.
- [ ] Register logger.
- [ ] Register error handler.
- [ ] Register not found handler.
- [ ] Register graceful shutdown.
- [ ] Export `startServer`.
- [ ] Export `buildServer` for tests.

Rules:

- [ ] Health routes may exist before business modules.
- [ ] Readiness must fail if required dependencies are unavailable.
- [ ] Server must close cleanly on `SIGINT`.
- [ ] Server must close cleanly on `SIGTERM`.
- [ ] Shutdown must close HTTP, database, Redis, queues, and mail resources when opened.

## Stage 4 - Logger standard

Use Pino through Fastify.

Development logging:

```text
pino-pretty
```

Rules:

- [ ] Pretty logging is development only.
- [ ] Production logs must stay JSON.
- [ ] Logs must include request id.
- [ ] Logs must include app name.
- [ ] Logs must include tenant id only when available and safe.
- [ ] Logs must not print secrets.
- [ ] Logs must not print full auth tokens.
- [ ] Errors must include safe error codes.

## Stage 5 - Database standard

Create database infrastructure adapter.

Required behavior:

- [ ] Read MariaDB config from environment.
- [ ] Create Kysely instance.
- [ ] Use `mysql2` pool.
- [ ] Add connection test helper.
- [ ] Add transaction helper.
- [ ] Add shutdown helper.
- [ ] Add migration folder standard.
- [ ] Add seeder folder standard.

Required folders per backend app:

```text
apps/<app-name>/api/src/infrastructure/database/
apps/<app-name>/api/src/migrations/
apps/<app-name>/api/src/seeders/
```

No business migrations are allowed in this task.

## Stage 6 - Queue standard

Create queue infrastructure adapter.

Required behavior:

- [ ] Read Redis config from environment.
- [ ] Create ioredis connection factory.
- [ ] Create BullMQ queue factory.
- [ ] Create worker factory.
- [ ] Create queue scheduler strategy if needed.
- [ ] Add dead-letter naming rule.
- [ ] Add retry naming rule.
- [ ] Add shutdown helper.

Rules:

- [ ] Queue names must include app boundary.
- [ ] Jobs must include request id when created from a request.
- [ ] Jobs must include tenant id and industry id when applicable.
- [ ] Business job handlers are not allowed in this task.

## Stage 7 - Mail standard

Create mail infrastructure adapter.

Required behavior:

- [ ] Read SMTP config from environment.
- [ ] Create Nodemailer transport factory.
- [ ] Add test connection helper.
- [ ] Add send mail wrapper.
- [ ] Add shutdown helper if applicable.
- [ ] Add safe logging around mail send failures.

Rules:

- [ ] App code must not import Nodemailer directly.
- [ ] Mail templates are not created in this task.
- [ ] No real email should be sent during automated tests unless explicitly configured.

## Stage 8 - Environment standard

Each backend app must define `.env.sample`.

Required base variables:

```text
NODE_ENV=
APP_NAME=
APP_PORT=
APP_HOST=
APP_PUBLIC_URL=
CORS_ORIGINS=
DATABASE_HOST=
DATABASE_PORT=
DATABASE_USER=
DATABASE_PASSWORD=
DATABASE_NAME=
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
```

Rules:

- [ ] Missing required env values must fail before server start.
- [ ] Invalid port values must fail before server start.
- [ ] Secrets must not be committed.
- [ ] `.env.sample` must contain names only or safe local defaults.

## Stage 9 - `preflight.mjs` standard

Every backend and frontend app must start through `preflight.mjs`.

Required file per runnable app:

```text
apps/<app-name>/api/preflight.mjs
apps/<app-name>/web/preflight.mjs
```

Required behavior:

- [ ] Print app name.
- [ ] Read the configured port.
- [ ] Validate the port.
- [ ] Check whether the port is already used.
- [ ] If used in development, find the process id.
- [ ] Kill only the process using that exact port.
- [ ] Recheck that the port is free.
- [ ] Start the app on the same configured port.
- [ ] Print the final local URL.
- [ ] Exit non-zero if the port cannot be freed.

Important rule:

- [ ] Do not change to a random fallback port when a configured app port is busy.

The app must reuse the same configured port after the old process is cleared.

## Stage 10 - Safe port kill rule

The preflight may kill a process only when all are true:

- [ ] `NODE_ENV` is not production.
- [ ] The port matches the app configured port.
- [ ] The process id was discovered from the port check.
- [ ] The process id is not the current process.
- [ ] The command prints which PID was killed.
- [ ] The port is checked again after killing.

Stop if:

- the process cannot be identified
- the port is used by a protected system process
- the port remains busy after kill
- the environment is production

## Stage 11 - App script standard

Every backend app package must include:

```json
{
  "scripts": {
    "dev": "node preflight.mjs",
    "start": "node dist/main.js",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "check": "npm run typecheck && npm run test && npm run build"
  }
}
```

Every frontend app package must include:

```json
{
  "scripts": {
    "dev": "node preflight.mjs",
    "build": "vite build",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "check": "npm run typecheck && npm run test && npm run build"
  }
}
```

## Stage 12 - Playwright standard

Playwright must be available for e2e smoke tests.

Required tests:

- [ ] backend health endpoint responds
- [ ] backend readiness endpoint responds
- [ ] frontend app shell loads
- [ ] frontend can reach backend health route
- [ ] service shuts down and restarts on same port

Rules:

- [ ] E2E tests must use configured ports.
- [ ] E2E tests must not depend on business data.
- [ ] E2E tests must clean up created test state.

## Stage 13 - Documentation updates

Update:

- [ ] `assist/documentation/changelog.md`.
- [ ] `assist/documentation/prompt-log.md`.
- [ ] app API README files.
- [ ] app web README files.
- [ ] framework runtime README if created.

Document:

- [ ] package ownership
- [ ] startup command
- [ ] port value
- [ ] preflight behavior
- [ ] shutdown behavior
- [ ] health/readiness route behavior
- [ ] queue dependency behavior
- [ ] mail dependency behavior

## Stage 14 - Verification

Run:

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run check`
- [ ] app `dev` command
- [ ] root `dev:<app>` command
- [ ] Playwright smoke tests

Manual verification:

- [ ] Start app.
- [ ] Confirm configured port is used.
- [ ] Start app again.
- [ ] Confirm old dev process is killed.
- [ ] Confirm same port is reused.
- [ ] Stop app.
- [ ] Confirm graceful shutdown logs.

## Stop conditions

Stop if:

- preflight would kill unknown processes
- a service starts on a fallback random port
- production mode attempts to kill a port process
- framework code imports app business modules
- app modules directly import infrastructure packages
- package versions conflict
- test stack cannot run locally
- file would exceed 700 lines

## Completion response

Report:

- backend runtime packages installed
- root concurrently scripts added
- Fastify server standard created
- logger standard created
- database adapter created
- queue adapter created
- mail adapter created
- preflight behavior created
- same-port reuse verified
- shutdown behavior verified
- Playwright smoke tests added
- verification commands run
- skipped checks with reason
- next recommended task
