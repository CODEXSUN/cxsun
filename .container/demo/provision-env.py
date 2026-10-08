#!/usr/bin/env python3
"""Write the protected demo env from the local sample and cxapp settings."""

from pathlib import Path
from secrets import token_urlsafe
from urllib.parse import urlsplit, urlunsplit


ROOT = Path(__file__).resolve().parents[2]
SAMPLE = ROOT / ".container/deploy.env.sample"
SOURCE = Path("/home/cxapp/.container/deploy.env")
TARGET = ROOT / ".container/demo/deploy.env"


def read_env(path: Path) -> dict[str, str]:
    return {
        key: value
        for line in path.read_text(encoding="utf-8").splitlines()
        if line and not line.lstrip().startswith("#") and "=" in line
        for key, value in [line.split("=", 1)]
    }


def with_redis_database(url: str, index: int) -> str:
    parts = urlsplit(url)
    if parts.scheme not in ("redis", "rediss") or not parts.hostname:
        raise ValueError("The cxapp Redis URL is invalid")
    return urlunsplit((parts.scheme, parts.netloc, f"/{index}", "", ""))


def main() -> None:
    if TARGET.exists():
        raise SystemExit("The demo env already exists; refusing to replace it")
    source = read_env(SOURCE)
    sample = read_env(SAMPLE)
    required = (
        "DB_USER",
        "DB_PASSWORD",
        "CXAPP_REDIS_URL",
        "FILEBROWSER_BASE_IMAGE",
        "MEDIA_ADMIN_USER",
        "MEDIA_ADMIN_PASSWORD",
    )
    missing = [key for key in required if not source.get(key)]
    if missing:
        raise SystemExit(f"The cxapp env is missing: {', '.join(missing)}")

    sample.update(
        PLATFORM_API_PORT="17210",
        PLATFORM_WEB_PORT="17220",
        PLATFORM_WEB_ORIGIN="https://demo.codexsun.com",
        DB_HOST="cxapp-mariadb",
        DB_PORT="3306",
        DB_USER=source["DB_USER"],
        DB_PASSWORD=source["DB_PASSWORD"],
        DB_MASTER_NAME="cxsun_demo_master_db",
        DEFAULT_TENANT_DB_NAME="cxsun_demo_db",
        DEFAULT_TENANT_DOMAIN="demo.codexsun.com",
        CXSUN_REDIS_URL=with_redis_database(source["CXAPP_REDIS_URL"], 1),
        JWT_SECRET=token_urlsafe(48),
        CXSUN_BACKUP_DIR="storage/backups/database",
        CXSUN_WEB_HOST="demo.codexsun.com",
        CXSUN_WEB_HOST_ALT="demo.codexsun.com",
        CXSUN_BIND_ADDRESS="127.0.0.1",
        FILEBROWSER_BASE_IMAGE=source["FILEBROWSER_BASE_IMAGE"],
        MEDIA_ADMIN_USER=source["MEDIA_ADMIN_USER"],
        MEDIA_ADMIN_PASSWORD=source["MEDIA_ADMIN_PASSWORD"],
        MEDIA_HOST_PORT="17290",
        CXSUN_DOCKER_NETWORK="cxapp-network",
        CXSUN_QUEUE_WORKER_ENABLED="0",
        MAIL_ENABLED="0",
        DEV_AUTO_TENANT_LOGIN="0",
    )
    for key in (
        "DEFAULT_TENANT_ADMIN_EMAIL",
        "DEFAULT_TENANT_ADMIN_NAME",
        "DEFAULT_TENANT_ADMIN_PASSWORD",
        "SOFTWARE_ADMIN_EMAIL",
        "SOFTWARE_ADMIN_NAME",
        "SOFTWARE_ADMIN_PASSWORD",
        "SUPER_ADMIN_EMAIL",
        "SUPER_ADMIN_NAME",
        "SUPER_ADMIN_PASSWORD",
        "TENANT_ADMIN_EMAIL",
        "TENANT_ADMIN_NAME",
        "TENANT_ADMIN_PASSWORD",
    ):
        if source.get(key):
            sample[key] = source[key]

    content = "".join(f"{key}={value}\n" for key, value in sample.items())
    TARGET.write_text(content, encoding="utf-8")
    TARGET.chmod(0o600)
    print("Created protected demo env with ports 17210, 17220, and 17290")


if __name__ == "__main__":
    main()
