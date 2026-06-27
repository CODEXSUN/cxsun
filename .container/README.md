# CXSun Docker Deploy Guide

This container setup now matches the cleaned billing workspace. It builds and runs only:

- `apps/server` on port `6005`
- `apps/frontend` preview on port `6010`
- optional CXMedia File Browser on port `6050`
- MariaDB and Redis support services

Deleted docs, product-app, and CXSync cloud runtimes are no longer part of the compose stack.

## Local Setup

```bash
bash .container/setup-local.sh
```

The local script creates `codexion-network` when needed, starts MariaDB and Redis, checks CXMedia, rebuilds `cxsun:v1`, and starts the main app.

Default local URLs:

<<<<<<< Updated upstream
- Public URL: `https://codexsun.com`
- Backend container port: `6005`
- Platform API container port: `6105` (prepared for split deployment; not yet part of the default full app runtime)
- Frontend container port: `6010`
- Docs container port: `6020`
- Product app ports: `6030` through `6044`
- CXMedia File Browser port: `6050`
- MariaDB access from the app: `mariadb:3306`
- Redis container access from the app: `redis:6379`
- Redis host access: `localhost:6380`
- External Redis is the default cloud mode: Redis runs as a separate container on `codexion-network`.
- Uploaded files live in a separate Docker volume named `cxmedia-storage`.
- CXMedia is a standalone `filebrowser/filebrowser` container for upload and media management.
- CORS defaults: `https://codexsun.com` and `https://www.codexsun.com`.

Default cloud app surfaces:

| App | Port |
| --- | ---: |
| Main tenant/admin/super-admin frontend | `6010` |
| Docs | `6020` |
| Auditor | `6030` |
| Ecommerce | `6031` |
| B2B Connect | `6032` |
| Sports | `6033` |
| Learning | `6034` |
| Welfare | `6035` |
| CRM | `6036` |
| Sites | `6037` |
| Blog | `6038` |
| ZETRO | `6039` |
| Textile Lab | `6040` |
| Garment | `6041` |
| UPVC | `6042` |
| B2B Connect Admin | `6043` |
| CXSync web console | `6044` |

## Platform API Preparation

Platform API is the first foundation service for the future split deployment. It is not yet wired as a default cloud container in this compose flow, but its standard runtime values are:

- workspace: `apps/platform-api`
- package: `@cxsun/platform-api`
- port env: `PLATFORM_API_PORT`
- default port: `6105`
- shared database env: `DB_*`

Local verification:

```bash
npm run typecheck:platform-api
npm run build:platform-api
npm -w apps/platform-api run test:smoke
```

The app list is controlled by `CLOUD_PRODUCT_APPS`, using `app-folder:port` pairs:

```bash
CLOUD_PRODUCT_APPS=auditor:6030,ecommerce:6031,b2b-connect:6032 bash .container/setup-cloud.sh --reinstall
```

Docs can be skipped with `CLOUD_DOCS_ENABLED=false`. CXSync Cloud is a private API service and stays off by default; enable it only with a real `CXSYNC_SERVICE_KEY`:

```bash
CLOUD_CXSYNC_CLOUD_ENABLED=true CXSYNC_SERVICE_KEY='replace-with-long-random-key' bash .container/setup-cloud.sh --reinstall
```

## Isolated CXSync Maintenance Deployment

Do not install CXSync maintenance with the full live-application reinstall command. The isolated deployment has its own container, image, workspace volume, and ports, and does not run the main application's database setup or tenant provisioner.

Before deployment, commit and push release `1.0.128` to the configured Git branch. Keep fleet cloning locked for the initial install, then run:

```bash
GIT_PULL_ON_START=true CXSYNC_EXPECTED_VERSION=1.0.128 \
  bash .container/setup-cxsync-maintenance.sh --reinstall
```

Required values are read from the repository `.env` when they are not exported: `DB_PASSWORD`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, and `CXSYNC_SERVICE_KEY`. The service uses:

- container `cxsun-cxsync-maintenance`;
- image `cxsun:cxsync-maintenance`;
- workspace volume `cxsync-maintenance-workspace`;
- evidence volume `cxsync-maintenance-storage`;
- web host port `6080`;
- API host port `6078`.

The script fails when the checked-out package version differs from `CXSYNC_EXPECTED_VERSION`. It also refuses initial startup when either fleet-clone safety flag is enabled and verifies that an already-running live `cxsun` container remains running. The maintenance service sets `CXSYNC_CLOUD_SKIP_PLATFORM_MIGRATIONS=true`: it checks connectivity to the existing master database but does not run shared platform migrations or seeds. CXSync-owned operational audit/batch tables remain allowed.

Install `apps/cxsync-cloud/deploy/nginx-cxsync.codexsun.com.conf`, test Nginx, and reload it only after both local health endpoints respond:

```bash
curl -fsS http://127.0.0.1:6078/health
curl -fsS http://127.0.0.1:6080/
nginx -t && systemctl reload nginx
```

Stop or remove only this maintenance runtime with:

```bash
bash .container/setup-cxsync-maintenance.sh --stop
```

Create the shared Docker network once:

```bash
docker network create codexion-network
```

If the network already exists, Docker will report it and you can continue.

## 2. Start Services

The app compose joins the existing `codexion-network`.

MariaDB is expected to already exist on the same Docker network with service/container host `mariadb`, port `3306`, and root password `DbPass1@@`.

Redis runs as a separate container on `codexion-network` by default:
=======
- Backend: `http://localhost:6005`
- Frontend: `http://localhost:6010`
- CXMedia: `http://localhost:6050`

## Cloud Setup
>>>>>>> Stashed changes

```bash
bash .container/setup-cloud.sh
```

Use `--fresh` or `--reinstall` to recreate the CXSun workspace and Redis cache without touching MariaDB:

```bash
bash .container/setup-cloud.sh --reinstall
```

Default cloud URLs:

- Frontend/public URL: `https://codexsun.com`
- Backend API URL: `https://codexsun.com`
- CXMedia: `http://localhost:6050`

## Important Environment Variables

```bash
PORT=6005
VITE_PORT=6010
VITE_API_BASE_URL=https://codexsun.com
VITE_STORAGE_BASE_URL=https://codexsun.com
FRONTEND_URL=https://codexsun.com
CORS_ORIGINS=https://codexsun.com,https://www.codexsun.com
DB_HOST=mariadb
DB_PORT=3306
DB_NAME=cxsun_master
DB_USER=root
DB_PASSWORD='DbPass1@@'
REDIS_HOST=redis
REDIS_PORT=6379
```

Admin seed variables are optional and are passed through when present:

```bash
SUPER_ADMIN_NAME='SUNDAR'
SUPER_ADMIN_EMAIL='admin@example.com'
SUPER_ADMIN_PASSWORD='change-me'
SOFTWARE_ADMIN_NAME='Admin'
SOFTWARE_ADMIN_EMAIL='software@example.com'
SOFTWARE_ADMIN_PASSWORD='change-me'
TENANT_ADMIN_NAME='ADMIN'
TENANT_ADMIN_EMAIL='tenant@example.com'
TENANT_ADMIN_PASSWORD='change-me'
```

## Manual Compose

```bash
docker network create codexion-network
docker compose -f .container/docker-compose.yml up -d --build
```

Check status:

```bash
docker compose -f .container/docker-compose.yml ps
docker compose -f .container/docker-compose.yml logs -f cxsun
curl http://localhost:6005/health
```

## Nginx

For production, proxy API and storage requests to the backend and the frontend to Vite preview:

```nginx
server {
  large_client_header_buffers 8 32k;
  client_header_buffer_size 16k;

  location /storage/ {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie "";
    proxy_pass http://127.0.0.1:6005;
  }

  location /api/ {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:6005;
  }

  location / {
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_pass http://127.0.0.1:6010;
  }
}
```

Reload Nginx after editing:

```bash
nginx -t && systemctl reload nginx
```

## Storage And Redis Helpers

Install or refresh CXMedia:

```bash
bash .container/setup-media.sh
bash .container/setup-media.sh --reinstall
```

Manage Redis:

```bash
bash .container/setup-redis.sh status
bash .container/setup-redis.sh restart
bash .container/setup-redis.sh reinstall
```

## Database Reset

Use reset commands only when you intentionally want to drop data:

```bash
bash .container/reset-databases.sh --clients
bash .container/reset-databases.sh --master
bash .container/reset-databases.sh --all
```
