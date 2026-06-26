#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/workspace/cxsun}"
GIT_BRANCH="${GIT_BRANCH:-main}"
CXSUN_RUNTIME_MODE="${CXSUN_RUNTIME_MODE:-application}"
FRONTEND_PORT="${VITE_PORT:-6010}"
SERVER_PORT="${PORT:-6005}"
PLATFORM_API_PORT="${PLATFORM_API_PORT:-6105}"
BILLING_API_PORT="${BILLING_API_PORT:-6205}"
ECOMMERCE_API_PORT="${ECOMMERCE_API_PORT:-6305}"
DOCS_PORT="${DOCS_PORT:-6020}"
API_BASE_URL="${VITE_API_BASE_URL:-https://codexsun.com}"
PLATFORM_API_BASE_URL="${VITE_PLATFORM_API_BASE_URL:-$API_BASE_URL}"
BILLING_API_BASE_URL="${VITE_BILLING_API_BASE_URL:-$API_BASE_URL}"
ECOMMERCE_API_BASE_URL="${VITE_ECOMMERCE_API_BASE_URL:-$API_BASE_URL}"
STORAGE_BASE_URL="${VITE_STORAGE_BASE_URL:-$API_BASE_URL}"
MEDIA_MANAGER_URL="${VITE_MEDIA_MANAGER_URL:-http://localhost:6050}"
FRONTEND_APP_URL="${FRONTEND_URL:-https://codexsun.com}"
CORS_ALLOWED_ORIGINS="${CORS_ORIGINS:-${FRONTEND_APP_URL},https://www.codexsun.com}"
CLOUD_DOCS_ENABLED="${CLOUD_DOCS_ENABLED:-true}"
CLOUD_PRODUCT_APPS="${CLOUD_PRODUCT_APPS:-auditor:6030,ecommerce:6031,b2b-connect:6032,sports:6033,learning:6034,welfare:6035,crm:6036,sites:6037,blog:6038,zetro:6039,textile-lab:6040,garment:6041,upvc:6042,b2b-connect-admin:6043,cxsync:6044}"
CLOUD_CXSYNC_CLOUD_ENABLED="${CLOUD_CXSYNC_CLOUD_ENABLED:-false}"
CXSYNC_CLOUD_PORT="${CXSYNC_CLOUD_PORT:-6077}"
CXSYNC_MAINTENANCE_WEB_PORT="${CXSYNC_MAINTENANCE_WEB_PORT:-6044}"
CXSYNC_EXPECTED_VERSION="${CXSYNC_EXPECTED_VERSION:-}"
CXSYNC_FLEET_CLONE_ENABLED="${CXSYNC_FLEET_CLONE_ENABLED:-false}"
CXSYNC_FLEET_SOURCE_QUIESCED="${CXSYNC_FLEET_SOURCE_QUIESCED:-false}"
CXSYNC_FLEET_DUMP_PATH="${CXSYNC_FLEET_DUMP_PATH:-mariadb-dump}"
CXSYNC_FLEET_CLIENT_PATH="${CXSYNC_FLEET_CLIENT_PATH:-mariadb}"
GIT_REPO_URL="${GIT_REPO_URL:-https://github.com/CODEXSUN/cxsun.git}"
DATABASE_HOST="${DB_HOST:-mariadb}"
DATABASE_PORT="${DB_PORT:-3306}"
DATABASE_NAME="${DB_NAME:-cxsun_master}"
DATABASE_USER="${DB_USER:-root}"
DATABASE_PASSWORD="${DB_PASSWORD:-DbPass1@@}"
AUTH_JWT_SECRET="${JWT_SECRET:-}"
AUTH_SUPER_ADMIN_NAME="${SUPER_ADMIN_NAME:-}"
AUTH_SUPER_ADMIN_EMAIL="${SUPER_ADMIN_EMAIL:-}"
AUTH_SUPER_ADMIN_PASSWORD="${SUPER_ADMIN_PASSWORD:-}"
AUTH_SOFTWARE_ADMIN_NAME="${SOFTWARE_ADMIN_NAME:-}"
AUTH_SOFTWARE_ADMIN_EMAIL="${SOFTWARE_ADMIN_EMAIL:-}"
AUTH_SOFTWARE_ADMIN_PASSWORD="${SOFTWARE_ADMIN_PASSWORD:-}"
AUTH_TENANT_ADMIN_NAME="${TENANT_ADMIN_NAME:-}"
AUTH_TENANT_ADMIN_EMAIL="${TENANT_ADMIN_EMAIL:-}"
AUTH_TENANT_ADMIN_PASSWORD="${TENANT_ADMIN_PASSWORD:-}"
REDIS_SERVICE_HOST="${REDIS_HOST:-redis}"
REDIS_SERVICE_PORT="${REDIS_PORT:-6379}"
REDIS_SERVICE_PASSWORD="${REDIS_PASSWORD:-}"
REDIS_SERVICE_DB="${REDIS_DB:-0}"
REDIS_SERVICE_TLS="${REDIS_TLS:-false}"
QUEUE_RUNTIME_ENABLED="${QUEUE_ENABLED:-true}"
DATABASE_BACKUP_INTERVAL="${DATABASE_BACKUP_INTERVAL_HOURS:-6}"
INSTALL_RUN_TESTS="${INSTALL_RUN_TESTS:-false}"
AUTO_SEED_TENANT_DOMAINS="${AUTO_SEED_TENANT_DOMAINS:-false}"
SKIP_MARIADB_WAIT="${SKIP_MARIADB_WAIT:-true}"
HEALTH_WAIT_SECONDS="${HEALTH_WAIT_SECONDS:-900}"

log_step() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"
}

run_step() {
  label="$1"
  shift

  log_step "START: $label"
  step_started_at="$(date +%s)"
  "$@"
  step_finished_at="$(date +%s)"
  echo "DONE: $label ($((step_finished_at - step_started_at))s)"
}

mkdir -p "$(dirname "$APP_DIR")"

if [ ! -d "$APP_DIR/.git" ]; then
  if [ -d "$APP_DIR" ]; then
    log_step "Cleaning $APP_DIR while preserving mounted storage"
    find "$APP_DIR" -mindepth 1 -maxdepth 1 ! -name storage -exec rm -rf {} +
  else
    mkdir -p "$APP_DIR"
  fi
  log_step "Cloning $GIT_REPO_URL branch $GIT_BRANCH into $APP_DIR"
  CLONE_DIR="$(mktemp -d)"
  git clone --branch "$GIT_BRANCH" "$GIT_REPO_URL" "$CLONE_DIR"
  cp -a "$CLONE_DIR/." "$APP_DIR/"
  rm -rf "$CLONE_DIR"
else
  log_step "Using existing repository at $APP_DIR"
fi

cd "$APP_DIR"

mkdir -p "$APP_DIR/storage/public" "$APP_DIR/apps/frontend/public"
if [ -L "$APP_DIR/apps/frontend/public/storage" ] && [ ! -e "$APP_DIR/apps/frontend/public/storage" ]; then
  rm -f "$APP_DIR/apps/frontend/public/storage"
fi
if [ ! -e "$APP_DIR/apps/frontend/public/storage" ]; then
  ln -s "$APP_DIR/storage/public" "$APP_DIR/apps/frontend/public/storage" 2>/dev/null || \
    mkdir -p "$APP_DIR/apps/frontend/public/storage"
fi

if [ "${GIT_PULL_ON_START:-false}" = "true" ]; then
  log_step "Pulling latest changes for $GIT_BRANCH"
  git fetch origin "$GIT_BRANCH"
  git pull --ff-only origin "$GIT_BRANCH"
fi

if [ ! -f .env ] && [ -f .env.sample ]; then
  log_step "Creating .env from .env.sample"
  cp .env.sample .env
fi

set_env_value() {
  key="$1"
  value="$2"

  if [ ! -f .env ]; then
    touch .env
  fi

  tmp_file="$(mktemp)"
  awk -v key="$key" -v value="$value" '
    BEGIN { done = 0 }
    index($0, key "=") == 1 {
      print key "=" value
      done = 1
      next
    }
    { print }
    END {
      if (done == 0) print key "=" value
    }
  ' .env > "$tmp_file"
  mv "$tmp_file" .env
}

get_env_value() {
  key="$1"

  if [ ! -f .env ]; then
    return 0
  fi

  grep "^${key}=" .env | tail -n 1 | cut -d= -f2- || true
}

set_env_optional() {
  key="$1"
  value="$2"

  if [ -n "$value" ]; then
    set_env_value "$key" "$value"
  fi
}

generate_secret() {
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
}

EXISTING_JWT_SECRET="$(get_env_value JWT_SECRET)"
if [ -z "$AUTH_JWT_SECRET" ]; then
  AUTH_JWT_SECRET="$EXISTING_JWT_SECRET"
fi

if [ -z "$AUTH_JWT_SECRET" ]; then
  AUTH_JWT_SECRET="$(generate_secret)"
  echo "Generated JWT_SECRET in .env"
fi

set_env_value "PORT" "$SERVER_PORT"
set_env_value "PLATFORM_API_PORT" "$PLATFORM_API_PORT"
set_env_value "BILLING_API_PORT" "$BILLING_API_PORT"
set_env_value "ECOMMERCE_API_PORT" "$ECOMMERCE_API_PORT"
set_env_value "VITE_PORT" "$FRONTEND_PORT"
set_env_value "DOCS_PORT" "$DOCS_PORT"
set_env_value "VITE_API_BASE_URL" "$API_BASE_URL"
set_env_value "VITE_PLATFORM_API_BASE_URL" "$PLATFORM_API_BASE_URL"
set_env_value "VITE_BILLING_API_BASE_URL" "$BILLING_API_BASE_URL"
set_env_value "VITE_ECOMMERCE_API_BASE_URL" "$ECOMMERCE_API_BASE_URL"
set_env_value "VITE_STORAGE_BASE_URL" "$STORAGE_BASE_URL"
set_env_value "VITE_MEDIA_MANAGER_URL" "$MEDIA_MANAGER_URL"
set_env_value "FRONTEND_URL" "$FRONTEND_APP_URL"
set_env_value "CORS_ORIGINS" "$CORS_ALLOWED_ORIGINS"
set_env_value "ELECTRON_DEV_SERVER_URL" "$FRONTEND_APP_URL"
set_env_value "EXPO_PUBLIC_API_URL" "${API_BASE_URL}/api"
set_env_value "DB_HOST" "$DATABASE_HOST"
set_env_value "DB_PORT" "$DATABASE_PORT"
set_env_value "DB_NAME" "$DATABASE_NAME"
set_env_value "DB_USER" "$DATABASE_USER"
set_env_value "DB_PASSWORD" "$DATABASE_PASSWORD"
set_env_value "JWT_SECRET" "$AUTH_JWT_SECRET"
set_env_optional "SUPER_ADMIN_NAME" "$AUTH_SUPER_ADMIN_NAME"
set_env_optional "SUPER_ADMIN_EMAIL" "$AUTH_SUPER_ADMIN_EMAIL"
set_env_optional "SUPER_ADMIN_PASSWORD" "$AUTH_SUPER_ADMIN_PASSWORD"
set_env_optional "SOFTWARE_ADMIN_NAME" "$AUTH_SOFTWARE_ADMIN_NAME"
set_env_optional "SOFTWARE_ADMIN_EMAIL" "$AUTH_SOFTWARE_ADMIN_EMAIL"
set_env_optional "SOFTWARE_ADMIN_PASSWORD" "$AUTH_SOFTWARE_ADMIN_PASSWORD"
set_env_optional "TENANT_ADMIN_NAME" "$AUTH_TENANT_ADMIN_NAME"
set_env_optional "TENANT_ADMIN_EMAIL" "$AUTH_TENANT_ADMIN_EMAIL"
set_env_optional "TENANT_ADMIN_PASSWORD" "$AUTH_TENANT_ADMIN_PASSWORD"
set_env_value "REDIS_HOST" "$REDIS_SERVICE_HOST"
set_env_value "REDIS_PORT" "$REDIS_SERVICE_PORT"
set_env_value "REDIS_PASSWORD" "$REDIS_SERVICE_PASSWORD"
set_env_value "REDIS_DB" "$REDIS_SERVICE_DB"
set_env_value "REDIS_TLS" "$REDIS_SERVICE_TLS"
set_env_value "QUEUE_ENABLED" "$QUEUE_RUNTIME_ENABLED"
set_env_value "DATABASE_BACKUP_INTERVAL_HOURS" "$DATABASE_BACKUP_INTERVAL"
set_env_value "INSTALL_RUN_TESTS" "$INSTALL_RUN_TESTS"
set_env_value "AUTO_SEED_TENANT_DOMAINS" "$AUTO_SEED_TENANT_DOMAINS"
set_env_value "SKIP_MARIADB_WAIT" "$SKIP_MARIADB_WAIT"
set_env_value "HEALTH_WAIT_SECONDS" "$HEALTH_WAIT_SECONDS"
set_env_value "CLOUD_DOCS_ENABLED" "$CLOUD_DOCS_ENABLED"
set_env_value "CLOUD_PRODUCT_APPS" "$CLOUD_PRODUCT_APPS"
set_env_value "CLOUD_CXSYNC_CLOUD_ENABLED" "$CLOUD_CXSYNC_CLOUD_ENABLED"
set_env_value "CXSYNC_CLOUD_PORT" "$CXSYNC_CLOUD_PORT"
set_env_value "CXSYNC_FLEET_CLONE_ENABLED" "$CXSYNC_FLEET_CLONE_ENABLED"
set_env_value "CXSYNC_FLEET_SOURCE_QUIESCED" "$CXSYNC_FLEET_SOURCE_QUIESCED"
set_env_value "CXSYNC_FLEET_DUMP_PATH" "$CXSYNC_FLEET_DUMP_PATH"
set_env_value "CXSYNC_FLEET_CLIENT_PATH" "$CXSYNC_FLEET_CLIENT_PATH"

export PORT="$SERVER_PORT"
export PLATFORM_API_PORT="$PLATFORM_API_PORT"
export BILLING_API_PORT="$BILLING_API_PORT"
export ECOMMERCE_API_PORT="$ECOMMERCE_API_PORT"
export VITE_PORT="$FRONTEND_PORT"
export DOCS_PORT="$DOCS_PORT"
export VITE_API_BASE_URL="$API_BASE_URL"
export VITE_PLATFORM_API_BASE_URL="$PLATFORM_API_BASE_URL"
export VITE_BILLING_API_BASE_URL="$BILLING_API_BASE_URL"
export VITE_ECOMMERCE_API_BASE_URL="$ECOMMERCE_API_BASE_URL"
export VITE_STORAGE_BASE_URL="$STORAGE_BASE_URL"
export VITE_MEDIA_MANAGER_URL="$MEDIA_MANAGER_URL"
export FRONTEND_URL="$FRONTEND_APP_URL"
export CORS_ORIGINS="$CORS_ALLOWED_ORIGINS"
export ELECTRON_DEV_SERVER_URL="$FRONTEND_APP_URL"
export EXPO_PUBLIC_API_URL="${API_BASE_URL}/api"
export DB_HOST="$DATABASE_HOST"
export DB_PORT="$DATABASE_PORT"
export DB_NAME="$DATABASE_NAME"
export DB_USER="$DATABASE_USER"
export DB_PASSWORD="$DATABASE_PASSWORD"
export JWT_SECRET="$AUTH_JWT_SECRET"
export SUPER_ADMIN_NAME="$AUTH_SUPER_ADMIN_NAME"
export SUPER_ADMIN_EMAIL="$AUTH_SUPER_ADMIN_EMAIL"
export SUPER_ADMIN_PASSWORD="$AUTH_SUPER_ADMIN_PASSWORD"
export SOFTWARE_ADMIN_NAME="$AUTH_SOFTWARE_ADMIN_NAME"
export SOFTWARE_ADMIN_EMAIL="$AUTH_SOFTWARE_ADMIN_EMAIL"
export SOFTWARE_ADMIN_PASSWORD="$AUTH_SOFTWARE_ADMIN_PASSWORD"
export TENANT_ADMIN_NAME="$AUTH_TENANT_ADMIN_NAME"
export TENANT_ADMIN_EMAIL="$AUTH_TENANT_ADMIN_EMAIL"
export TENANT_ADMIN_PASSWORD="$AUTH_TENANT_ADMIN_PASSWORD"
export REDIS_HOST="$REDIS_SERVICE_HOST"
export REDIS_PORT="$REDIS_SERVICE_PORT"
export REDIS_PASSWORD="$REDIS_SERVICE_PASSWORD"
export REDIS_DB="$REDIS_SERVICE_DB"
export REDIS_TLS="$REDIS_SERVICE_TLS"
export QUEUE_ENABLED="$QUEUE_RUNTIME_ENABLED"
export DATABASE_BACKUP_INTERVAL_HOURS="$DATABASE_BACKUP_INTERVAL"
export INSTALL_RUN_TESTS="$INSTALL_RUN_TESTS"
export AUTO_SEED_TENANT_DOMAINS="$AUTO_SEED_TENANT_DOMAINS"
export SKIP_MARIADB_WAIT="$SKIP_MARIADB_WAIT"
export HEALTH_WAIT_SECONDS="$HEALTH_WAIT_SECONDS"
export CLOUD_DOCS_ENABLED="$CLOUD_DOCS_ENABLED"
export CLOUD_PRODUCT_APPS="$CLOUD_PRODUCT_APPS"
export CLOUD_CXSYNC_CLOUD_ENABLED="$CLOUD_CXSYNC_CLOUD_ENABLED"
export CXSYNC_CLOUD_PORT="$CXSYNC_CLOUD_PORT"
export CXSYNC_FLEET_CLONE_ENABLED="$CXSYNC_FLEET_CLONE_ENABLED"
export CXSYNC_FLEET_SOURCE_QUIESCED="$CXSYNC_FLEET_SOURCE_QUIESCED"
export CXSYNC_FLEET_DUMP_PATH="$CXSYNC_FLEET_DUMP_PATH"
export CXSYNC_FLEET_CLIENT_PATH="$CXSYNC_FLEET_CLIENT_PATH"

echo "Configured ports: backend=$SERVER_PORT platform-api=$PLATFORM_API_PORT billing-api=$BILLING_API_PORT ecommerce-api=$ECOMMERCE_API_PORT frontend=$FRONTEND_PORT api=$API_BASE_URL platformApi=$PLATFORM_API_BASE_URL billingApi=$BILLING_API_BASE_URL ecommerceApi=$ECOMMERCE_API_BASE_URL storage=$STORAGE_BASE_URL media=$MEDIA_MANAGER_URL"
echo "Configured docs: enabled=$CLOUD_DOCS_ENABLED port=$DOCS_PORT"
echo "Configured product apps: $CLOUD_PRODUCT_APPS"
echo "Configured CXSync Cloud: enabled=$CLOUD_CXSYNC_CLOUD_ENABLED port=$CXSYNC_CLOUD_PORT"
echo "Runtime mode: $CXSUN_RUNTIME_MODE"
echo "Configured services: db=$DB_HOST:$DB_PORT redis=$REDIS_HOST:$REDIS_PORT"
echo "Install tests: $INSTALL_RUN_TESTS"
echo "Auto seed tenant domains: $AUTO_SEED_TENANT_DOMAINS"
echo "MariaDB wait skipped: $SKIP_MARIADB_WAIT"
echo "Health wait limit: ${HEALTH_WAIT_SECONDS}s"

if [ "$SKIP_MARIADB_WAIT" = "true" ]; then
  log_step "Skipping MariaDB preflight wait"
else
  log_step "Waiting for MariaDB at $DB_HOST:$DB_PORT"
  for attempt in $(seq 1 60); do
    if mysqladmin ping \
      --host="$DB_HOST" \
      --port="$DB_PORT" \
      --user="$DB_USER" \
      --password="$DB_PASSWORD" \
      --silent >/dev/null 2>&1; then
      echo "MariaDB is reachable"
      break
    fi

    if [ "$attempt" -eq 60 ]; then
      echo "MariaDB was not reachable after waiting. Continuing to database setup for the real connection check." >&2
      break
    fi

    sleep 2
  done
fi

if [ "$CXSUN_RUNTIME_MODE" != "cxsync-maintenance" ] && [ "$QUEUE_RUNTIME_ENABLED" != "false" ]; then
  log_step "Waiting for Redis at $REDIS_HOST:$REDIS_PORT"
  for attempt in $(seq 1 "$HEALTH_WAIT_SECONDS"); do
    if timeout 2 bash -c "cat < /dev/null > /dev/tcp/$REDIS_HOST/$REDIS_PORT" >/dev/null 2>&1; then
      echo "Redis port is reachable"
      break
    fi

    if [ "$attempt" -eq "$HEALTH_WAIT_SECONDS" ]; then
      echo "Redis was not reachable after waiting. Queue workers will fall back to MariaDB only." >&2
      break
    fi

    sleep 1
  done
fi

if [ -f package-lock.json ]; then
  run_step "Installing dependencies with npm ci" npm ci --no-audit --fund=false
else
  run_step "Installing dependencies with npm install" npm install --no-audit --fund=false
fi

if [ "$CXSUN_RUNTIME_MODE" = "cxsync-maintenance" ]; then
  log_step "Starting isolated CXSync maintenance runtime"

  CURRENT_VERSION="$(node -p "require('./package.json').version")"
  if [ -n "$CXSYNC_EXPECTED_VERSION" ] && [ "$CURRENT_VERSION" != "$CXSYNC_EXPECTED_VERSION" ]; then
    echo "CXSync maintenance version mismatch: expected $CXSYNC_EXPECTED_VERSION, checked out $CURRENT_VERSION." >&2
    exit 1
  fi

  run_step "Cleaning CXSync maintenance build output" rm -rf build/apps/cxsync build/cxsync-cloud
  run_step "Building CXSync maintenance web console" npm -w apps/cxsync run build:web
  run_step "Building CXSync Cloud maintenance service" npm -w apps/cxsync-cloud run build

  log_step "Starting CXSync Cloud maintenance API on port $CXSYNC_CLOUD_PORT"
  CXSYNC_CLOUD_PORT="$CXSYNC_CLOUD_PORT" CXSYNC_CLOUD_HOST="${HOST:-0.0.0.0}" npm -w apps/cxsync-cloud run start &
  CXSYNC_CLOUD_PID="$!"

  log_step "Starting CXSync maintenance web console on port $CXSYNC_MAINTENANCE_WEB_PORT"
  (cd apps/cxsync && npx vite preview --host 0.0.0.0 --port "$CXSYNC_MAINTENANCE_WEB_PORT") &
  CXSYNC_WEB_PID="$!"

  maintenance_shutdown() {
    echo "Stopping isolated CXSync maintenance runtime"
    kill "$CXSYNC_CLOUD_PID" "$CXSYNC_WEB_PID" 2>/dev/null || true
    wait "$CXSYNC_CLOUD_PID" "$CXSYNC_WEB_PID" 2>/dev/null || true
  }
  trap maintenance_shutdown INT TERM

  log_step "Waiting for isolated CXSync Cloud health"
  for attempt in $(seq 1 120); do
    if curl -fsS "http://127.0.0.1:${CXSYNC_CLOUD_PORT}/health" >/dev/null 2>&1; then
      echo "Isolated CXSync maintenance runtime ready at version $CURRENT_VERSION."
      break
    fi
    if [ "$attempt" -eq 120 ]; then
      echo "Isolated CXSync Cloud health failed." >&2
      maintenance_shutdown
      exit 1
    fi
    sleep 2
  done

  wait -n "$CXSYNC_CLOUD_PID" "$CXSYNC_WEB_PID"
  maintenance_shutdown
  exit 1
fi

if [ "$CXSUN_RUNTIME_MODE" = "platform-api" ]; then
  log_step "Starting isolated Platform API runtime"
  run_step "Cleaning Platform API build output" rm -rf build/platform-api apps/platform-api/dist
  run_step "Building Platform API" npm run build:platform-api

  log_step "Starting Platform API on port $PLATFORM_API_PORT"
  PLATFORM_API_PORT="$PLATFORM_API_PORT" HOST="${HOST:-0.0.0.0}" npm -w apps/platform-api run start &
  PLATFORM_API_PID="$!"

  platform_api_shutdown() {
    echo "Stopping isolated Platform API runtime"
    kill "$PLATFORM_API_PID" 2>/dev/null || true
    wait "$PLATFORM_API_PID" 2>/dev/null || true
  }
  trap platform_api_shutdown INT TERM

  log_step "Waiting for Platform API health"
  for attempt in $(seq 1 "$HEALTH_WAIT_SECONDS"); do
    if curl -fsS "http://127.0.0.1:${PLATFORM_API_PORT}/health" >/dev/null 2>&1; then
      echo "Platform API runtime ready."
      break
    fi
    if [ "$attempt" -eq "$HEALTH_WAIT_SECONDS" ]; then
      echo "Platform API health failed." >&2
      platform_api_shutdown
      exit 1
    fi
    sleep 1
  done

  wait "$PLATFORM_API_PID"
  platform_api_shutdown
  exit 1
fi

if [ "$CXSUN_RUNTIME_MODE" = "billing-api" ]; then
  log_step "Starting isolated Billing API runtime"
  run_step "Cleaning Billing API build output" rm -rf build/billing-api apps/billing-api/dist
  run_step "Building Billing API" npm run build:billing-api

  log_step "Starting Billing API on port $BILLING_API_PORT"
  BILLING_API_PORT="$BILLING_API_PORT" HOST="${HOST:-0.0.0.0}" npm -w apps/billing-api run start &
  BILLING_API_PID="$!"

  billing_api_shutdown() {
    echo "Stopping isolated Billing API runtime"
    kill "$BILLING_API_PID" 2>/dev/null || true
    wait "$BILLING_API_PID" 2>/dev/null || true
  }
  trap billing_api_shutdown INT TERM

  log_step "Waiting for Billing API health"
  for attempt in $(seq 1 "$HEALTH_WAIT_SECONDS"); do
    if curl -fsS "http://127.0.0.1:${BILLING_API_PORT}/health" >/dev/null 2>&1; then
      echo "Billing API runtime ready."
      break
    fi
    if [ "$attempt" -eq "$HEALTH_WAIT_SECONDS" ]; then
      echo "Billing API health failed." >&2
      billing_api_shutdown
      exit 1
    fi
    sleep 1
  done

  wait "$BILLING_API_PID"
  billing_api_shutdown
  exit 1
fi

if [ "$CXSUN_RUNTIME_MODE" = "ecommerce-api" ]; then
  log_step "Starting isolated Ecommerce API runtime"
  run_step "Cleaning Ecommerce API build output" rm -rf build/ecommerce-api apps/ecommerce-api/dist
  run_step "Building Ecommerce API" npm run build:ecommerce-api

  log_step "Starting Ecommerce API on port $ECOMMERCE_API_PORT"
  ECOMMERCE_API_PORT="$ECOMMERCE_API_PORT" HOST="${HOST:-0.0.0.0}" npm -w apps/ecommerce-api run start &
  ECOMMERCE_API_PID="$!"

  ecommerce_api_shutdown() {
    echo "Stopping isolated Ecommerce API runtime"
    kill "$ECOMMERCE_API_PID" 2>/dev/null || true
    wait "$ECOMMERCE_API_PID" 2>/dev/null || true
  }
  trap ecommerce_api_shutdown INT TERM

  log_step "Waiting for Ecommerce API health"
  for attempt in $(seq 1 "$HEALTH_WAIT_SECONDS"); do
    if curl -fsS "http://127.0.0.1:${ECOMMERCE_API_PORT}/health" >/dev/null 2>&1; then
      echo "Ecommerce API runtime ready."
      break
    fi
    if [ "$attempt" -eq "$HEALTH_WAIT_SECONDS" ]; then
      echo "Ecommerce API health failed." >&2
      ecommerce_api_shutdown
      exit 1
    fi
    sleep 1
  done

  wait "$ECOMMERCE_API_PID"
  ecommerce_api_shutdown
  exit 1
fi

run_step "Running database setup" npm -w apps/server run db:setup

if [ "$INSTALL_RUN_TESTS" = "true" ]; then
  run_step "Running tenant static safety test" npm run test:tenant-static
  run_step "Running tenant isolation safety test" npm run test:tenant-isolation
else
  log_step "Skipping tenant safety tests during install"
fi

run_step "Cleaning previous build output" rm -rf build apps/server/dist apps/frontend/dist

run_step "Building CXSun" npm run build:active

if [ "$CLOUD_DOCS_ENABLED" = "true" ]; then
  run_step "Building docs app" npm -w apps/docs run build
else
  log_step "Skipping docs app build"
fi

start_product_app_preview() {
  app_name="$1"
  app_port="$2"

  log_step "Starting $app_name preview on port $app_port"
  if [ "$app_name" = "cxsync" ]; then
    (cd "apps/$app_name" && VITE_PORT="$app_port" npx vite preview --host 0.0.0.0 --port "$app_port") &
  else
    VITE_PORT="$app_port" npm -w "apps/$app_name" run preview -- --host 0.0.0.0 --port "$app_port" &
  fi
  PRODUCT_APP_PIDS="$PRODUCT_APP_PIDS $!"
  echo "$app_name preview PID: $!"
}

build_product_app() {
  app_name="$1"

  if [ "$app_name" = "cxsync" ]; then
    run_step "Building $app_name web app" npm -w apps/cxsync run build:web
    return
  fi

  run_step "Building $app_name app" npm -w "apps/$app_name" run build
}

for app_spec in ${CLOUD_PRODUCT_APPS//,/ }; do
  app_name="${app_spec%%:*}"
  app_port="${app_spec##*:}"
  if [ -z "$app_name" ] || [ -z "$app_port" ] || [ "$app_name" = "$app_port" ]; then
    echo "Invalid CLOUD_PRODUCT_APPS item: $app_spec" >&2
    exit 1
  fi
  build_product_app "$app_name"
done

if [ "$CLOUD_CXSYNC_CLOUD_ENABLED" = "true" ]; then
  run_step "Building CXSync Cloud service" npm -w apps/cxsync-cloud run build
else
  log_step "Skipping CXSync Cloud build"
fi

log_step "Starting backend on port $SERVER_PORT"
PORT="$SERVER_PORT" HOST="${HOST:-0.0.0.0}" npm -w apps/server run start &
SERVER_PID="$!"
echo "Backend process PID: $SERVER_PID"

if [ "$CLOUD_CXSYNC_CLOUD_ENABLED" = "true" ]; then
  log_step "Starting CXSync Cloud on port $CXSYNC_CLOUD_PORT"
  CXSYNC_CLOUD_PORT="$CXSYNC_CLOUD_PORT" CXSYNC_CLOUD_HOST="${HOST:-0.0.0.0}" npm -w apps/cxsync-cloud run start &
  CXSYNC_CLOUD_PID="$!"
  echo "CXSync Cloud process PID: $CXSYNC_CLOUD_PID"
else
  CXSYNC_CLOUD_PID=""
fi

log_step "Starting frontend preview on port $FRONTEND_PORT"
VITE_PORT="$FRONTEND_PORT" npm -w apps/frontend run preview -- --host 0.0.0.0 --port "$FRONTEND_PORT" &
FRONTEND_PID="$!"
echo "Frontend preview process PID: $FRONTEND_PID"

if [ "$CLOUD_DOCS_ENABLED" = "true" ]; then
  log_step "Starting docs app on port $DOCS_PORT"
  npm -w apps/docs run docusaurus -- serve --host 0.0.0.0 --port "$DOCS_PORT" &
  DOCS_PID="$!"
  echo "Docs process PID: $DOCS_PID"
else
  DOCS_PID=""
fi

PRODUCT_APP_PIDS=""
for app_spec in ${CLOUD_PRODUCT_APPS//,/ }; do
  start_product_app_preview "${app_spec%%:*}" "${app_spec##*:}"
done

shutdown() {
  echo "Stopping CXSun processes"
  kill "$SERVER_PID" "$FRONTEND_PID" ${DOCS_PID:-} ${CXSYNC_CLOUD_PID:-} $PRODUCT_APP_PIDS 2>/dev/null || true
  wait "$SERVER_PID" "$FRONTEND_PID" ${DOCS_PID:-} ${CXSYNC_CLOUD_PID:-} $PRODUCT_APP_PIDS 2>/dev/null || true
}

log_step "Waiting for backend health"
HEALTH_ATTEMPTS=$((HEALTH_WAIT_SECONDS / 2))
if [ "$HEALTH_ATTEMPTS" -lt 1 ]; then
  HEALTH_ATTEMPTS=1
fi

for attempt in $(seq 1 "$HEALTH_ATTEMPTS"); do
  if curl -fsS "http://127.0.0.1:${SERVER_PORT}/health" >/dev/null 2>&1; then
    echo "Backend health passed"
    break
  fi

  if [ "$attempt" -eq "$HEALTH_ATTEMPTS" ]; then
    echo "Backend health failed after ${HEALTH_WAIT_SECONDS}s" >&2
    shutdown
    exit 1
  fi

  if [ "$attempt" -eq 1 ] || [ $((attempt % 10)) -eq 0 ]; then
    echo "Waiting for backend health... attempt ${attempt}/${HEALTH_ATTEMPTS}"
  fi

  sleep 2
done

if [ "$AUTO_SEED_TENANT_DOMAINS" = "true" ]; then
  log_step "Checking strict tenant resolver"
  curl -fsS "http://127.0.0.1:${SERVER_PORT}/api/site/tenant-static?domain=codexsun.com" | grep -q '"resolved":true'
  echo "Tenant resolver passed"
else
  log_step "Skipping auto-seeded tenant resolver check"
  if curl -fsS "http://127.0.0.1:${SERVER_PORT}/api/site/tenant-static?domain=codexsun.com" | grep -q '"resolved":true'; then
    echo "Tenant resolver passed for existing configured domain"
  else
    echo "Tenant resolver domain is not auto-created. Configure tenant domains manually in Super Admin."
  fi
fi

trap shutdown INT TERM

wait -n "$SERVER_PID" "$FRONTEND_PID" ${DOCS_PID:-} ${CXSYNC_CLOUD_PID:-} $PRODUCT_APP_PIDS
shutdown
