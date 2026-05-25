# CXSun Docker Deploy Guide

This container setup deploys CXSun from the fixed repository:

```bash
https://github.com/CODEXSUN/cxsun.git
```

It clones the repo into `/workspace/cxsun`, creates `.env` from `.env.sample` when needed, writes container port/database values, builds into root `build/`, then runs the backend and frontend preview.

Default services:

- Public URL: `https://codexsun.com`
- Backend container port: `6005`
- Frontend container port: `6010`
- MariaDB access from the app: `mariadb:3306`
- Redis container access from the app: `redis:6379`
- Redis host access: `localhost:6380`
- CORS defaults: `https://codexsun.com` and `https://www.codexsun.com`.

Create the shared Docker network once:

```bash
docker network create codexion-network
```

If the network already exists, Docker will report it and you can continue.

## 2. Start Services

The app compose joins the existing `codexion-network`.

MariaDB is expected to already exist on the same Docker network with service/container host `mariadb`, port `3306`, and root password `DbPass1@@`.

Install/start Redis:

```bash
docker compose -f .container/database/redis.yml up -d
```

The app defaults to these container service names:

- MariaDB host: `mariadb`
- Redis host: `redis`

Redis intentionally publishes a host port that does not conflict with typical local installs:

- Redis container port `6379` is published as host port `6380`.

## 3. Build Image

Build only the Docker image:

```bash
docker build -f .container/Dockerfile -t cxsun:v1 .
```

## 4. Start With Compose

Start the app in the background:

```bash
docker compose -f .container/docker-compose.yml up -d --build
```

First startup will:

- Clone `https://github.com/CODEXSUN/cxsun.git` into `/workspace/cxsun`
- Copy `.env.sample` to `.env` if `.env` does not exist
- Write the configured ports, MariaDB host, and Redis host into `.env`
- Start Redis with `.container/database/redis.yml` when using the setup scripts
- Run `npm ci` or `npm install`
- Run `npm run build:active`
- Start backend and frontend preview

## 5. Check Status

Show running containers:

```bash
docker compose -f .container/docker-compose.yml ps
```

Check backend health:

```bash
curl https://codexsun.com/health
```

Open frontend:

```bash
https://codexsun.com
```

## 6. View Logs

Follow live logs:

```bash
docker compose -f .container/docker-compose.yml logs -f cxsun
```

Show recent logs:

```bash
docker compose -f .container/docker-compose.yml logs --tail=200 cxsun
```

## 7. Enter Bash

Open a shell inside the running container:

```bash
docker compose -f .container/docker-compose.yml exec cxsun bash
```

Go to the app folder:

```bash
cd /workspace/cxsun
```

## 8. Manual Pull, Build, Restart

Enter the container:

```bash
docker compose -f .container/docker-compose.yml exec cxsun bash
```

Pull updates and rebuild:

```bash
cd /workspace/cxsun
git pull --ff-only
npm ci
npm run build:active
exit
```

Restart the container:

```bash
docker compose -f .container/docker-compose.yml restart cxsun
```

## 9. Custom Ports

Run backend on `7005`, frontend on `7010`, and keep the public cloud URL:

```bash
PORT=7005 VITE_PORT=7010 VITE_API_BASE_URL=https://codexsun.com FRONTEND_URL=https://codexsun.com CORS_ORIGINS=https://codexsun.com,https://www.codexsun.com docker compose -f .container/docker-compose.yml up -d --build
```

Then use:

- Public URL: `https://codexsun.com`

## 10. Cloud Deploy Script

Run the cloud deploy order for `https://codexsun.com`:

```bash
bash .container/setup-cloud.sh
```

Run a fresh app reinstall without touching MariaDB:

```bash
bash .container/setup-cloud.sh --fresh
```

The script will:

- Create `codexion-network` when missing
- Start Redis through `.container/database/redis.yml`
- Use the existing MariaDB service at `mariadb:3306`
- Build the `cxsun:v1` image
- Start the app through `.container/docker-compose.yml`
- Configure `VITE_API_BASE_URL`, `FRONTEND_URL`, and `CORS_ORIGINS` for `https://codexsun.com`
- Remove only the CXSun app workspace volume when `--fresh` is passed
- Never remove or recreate MariaDB
- Print status and recent logs

## 11. Clean Local Redeploy Script

Run the full local redeploy order:

```bash
bash .container/setup-local.sh
```

The script will:

- Create `codexion-network` when missing
- Stop and remove the existing `cxsun` container
- Remove the `cxsun-volume` workspace volume
- Remove the old `cxsun_cxsun-workspace` volume when present
- Build the `cxsun:v1` image
- Start the app through `.container/docker-compose.yml`
- Print status and recent logs

## 12. Stop Or Remove

Stop the container:

```bash
docker compose -f .container/docker-compose.yml stop
```

Stop and remove the container/network:

```bash
docker compose -f .container/docker-compose.yml down
```

Remove the persistent workspace volume too:

```bash
docker compose -f .container/docker-compose.yml down -v
```

The persistent workspace volume is named `cxsun-volume`.
