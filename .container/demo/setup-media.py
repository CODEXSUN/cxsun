#!/usr/bin/env python3
"""Configure the demo FileBrowser with the protected demo credentials."""

import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = ROOT / ".container/demo/deploy.env"
COMPOSE_FILE = ROOT / ".container/demo/docker-compose.yml"


def read_env(path: Path) -> dict[str, str]:
    return {
        key: value
        for line in path.read_text(encoding="utf-8").splitlines()
        if line and not line.lstrip().startswith("#") and "=" in line
        for key, value in [line.split("=", 1)]
    }


def main() -> None:
    values = read_env(ENV_FILE)
    for key in ("FILEBROWSER_BASE_IMAGE", "MEDIA_ADMIN_USER", "MEDIA_ADMIN_PASSWORD"):
        if not values.get(key):
            raise SystemExit(f"The protected demo env is missing {key}")

    compose = [
        "docker",
        "compose",
        "--env-file",
        str(ENV_FILE),
        "-f",
        str(COMPOSE_FILE),
    ]
    subprocess.run([*compose, "stop", "media"], check=True, stdout=subprocess.DEVNULL)
    script = """
mkdir -p /srv /database
filebrowser config init --database /database/filebrowser.db >/dev/null 2>&1 || true
filebrowser config set --root /srv --scope / --minimumPasswordLength 1 --database /database/filebrowser.db >/dev/null
filebrowser users update "$MEDIA_ADMIN_USER" --password "$MEDIA_ADMIN_PASSWORD" --scope / --perm.admin --perm.create --perm.delete --perm.download --perm.modify --perm.rename --perm.share --database /database/filebrowser.db >/dev/null 2>&1 || filebrowser users add "$MEDIA_ADMIN_USER" "$MEDIA_ADMIN_PASSWORD" --scope / --perm.admin --perm.create --perm.delete --perm.download --perm.modify --perm.rename --perm.share --database /database/filebrowser.db >/dev/null
"""
    subprocess.run(
        [
            "docker",
            "run",
            "--rm",
            "--user",
            "0:0",
            "--entrypoint",
            "sh",
            "-e",
            "MEDIA_ADMIN_USER",
            "-e",
            "MEDIA_ADMIN_PASSWORD",
            "-v",
            "cxsun-demo-media-data:/srv",
            "-v",
            "cxsun-demo-media-db:/database",
            values["FILEBROWSER_BASE_IMAGE"],
            "-ec",
            script,
        ],
        check=True,
        env={
            **os.environ,
            "MEDIA_ADMIN_USER": values["MEDIA_ADMIN_USER"],
            "MEDIA_ADMIN_PASSWORD": values["MEDIA_ADMIN_PASSWORD"],
        },
        stdout=subprocess.DEVNULL,
    )
    subprocess.run([*compose, "up", "-d", "--no-build", "media"], check=True)
    print("Demo FileBrowser credentials configured")


if __name__ == "__main__":
    main()
