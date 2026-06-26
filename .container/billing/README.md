# Billing Deployment

This directory is the independent deployment unit for the CXSun Billing application.

## Services

| Service | Workspace | Container port | Responsibility |
| --- | --- | ---: | --- |
| `platform-api` | `apps/platform-api` | `6105` | Authentication, tenant resolution, companies, accounting years, RBAC, app enablement, and shared platform contracts |
| `billing-api` | `apps/billing-api` | `6205` | Billing, accounts, settlement, and billing-owned stock workflows |
| `billing-frontend` | `apps/frontend` | `80` | Current shared frontend compiled for the Platform + Billing service pair |

MariaDB, Redis, `codexion-network`, and the media/storage volume are external infrastructure. This Compose project never creates or removes MariaDB or Redis.

The Platform API image compiles the shared `@cxsun/platform` runtime before compiling `apps/platform-api`; the Billing API build already enforces the same shared-runtime prerequisite through its workspace prebuild.
API runtime images install only the external production dependencies declared by the service and shared Platform manifests. They copy only compiled service code plus `@cxsun/platform`, rather than carrying every monorepo workspace into production.

## First Deployment

```bash
cp .container/billing/.env.sample .container/billing/.env
nano .container/billing/.env
bash .container/billing/setup.sh up
```

Set real values for `DB_PASSWORD` and `JWT_SECRET`. Platform API and Billing API must use the same JWT secret so Platform-issued sessions are accepted by Billing API.

Default deployment host ports:

- Billing frontend: `6010`
- Platform API: `6105`
- Billing API: `6205`

## Local Billing Stack

For local Docker verification, use the Billing-only stack helper. It starts MariaDB and Redis, runs database setup/seeding on the Docker network, then runs the Platform API, Billing API, and Billing frontend with local URLs. The local frontend defaults to `6011` to avoid collisions with the existing all-in-one local frontend on `6010`.

```bash
bash .container/billing/billing-stack.sh up
```

The script creates `.container/billing/.env.local` from `.container/billing/.env.local.sample` if it is missing. To use a custom env file:

```bash
BILLING_ENV_FILE=.container/billing/.env.local bash .container/billing/billing-stack.sh up
```

Useful local commands:

```bash
bash .container/billing/billing-stack.sh status
bash .container/billing/billing-stack.sh logs
bash .container/billing/billing-stack.sh verify
bash .container/billing/billing-stack.sh down
```

CXMedia is optional for this Billing boot check. Set `BILLING_START_MEDIA=true` in `.container/billing/.env.local` if you want the local media UI started too.

Database setup is enabled by default through `BILLING_DB_SETUP=true`. It runs the existing `npm run db:setup -- --target=all` command from a temporary Node container attached to `codexion-network`, so seeded tenant database hosts remain reachable as `mariadb` from the Billing containers. Set `BILLING_DB_SETUP=false` when you only want to restart already-seeded services.

## Deploy One Changed Service

The images and services are independent:

```bash
docker compose --env-file .container/billing/.env -f .container/billing/docker-compose.yml up -d --build billing-api
docker compose --env-file .container/billing/.env -f .container/billing/docker-compose.yml up -d --build platform-api
docker compose --env-file .container/billing/.env -f .container/billing/docker-compose.yml up -d --build billing-frontend
```

Deploy Platform API before dependent services when its public contract changes.

## Verification

```bash
curl -fsS http://127.0.0.1:6105/health
curl -fsS http://127.0.0.1:6205/health
curl -fsS http://127.0.0.1:6010/health
docker compose --env-file .container/billing/.env -f .container/billing/docker-compose.yml ps
```

The frontend build enables the extracted-service readiness gate for only `platform,billing`.
Its Docker build replaces the local `apps/frontend/public/storage` junction with an empty build-time directory; uploaded media remains served from the external storage volume/API and is never copied into the static image.

## Reverse Proxy

Use separate public origins so browser routing remains explicit:

```text
billing.codexsun.com      -> 127.0.0.1:6010
platform-api.codexsun.com -> 127.0.0.1:6105
billing-api.codexsun.com  -> 127.0.0.1:6205
```

Add all frontend origins to `BILLING_CORS_ORIGINS` as a comma-separated list.

## Current Frontend Boundary

The Billing stack currently packages `apps/frontend` because a dedicated `billing-web` workspace does not yet exist. The image is still Billing-specific: API URLs and readiness dependencies are baked during its own Docker build. A later frontend extraction can replace only `Dockerfile.frontend` and the `billing-frontend` build context without changing the Platform/Billing service topology.
