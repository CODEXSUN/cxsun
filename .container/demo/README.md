# CXSUN demo on Hostinger

The demo uses loopback ports `17210` (API), `17220` (web), and `17290` (FileBrowser). Cloudflare Tunnel sends `demo.codexsun.com` to `http://cxsun-demo-web:80` on `cxapp-network`.

The API uses the existing cxapp MariaDB and Redis services through `cxapp-network`. The demo uses separate database names, Redis database index, and storage volumes. Keep `.container/demo/deploy.env` on the VPS only. Do not commit it.

On the VPS, run `python3 .container/demo/provision-env.py` once from the repository root. The script reads the protected cxapp env and writes a protected demo env. Start the stack with `docker compose --env-file .container/demo/deploy.env -f .container/demo/docker-compose.yml up -d --build`. Run `python3 .container/demo/setup-media.py` to apply the FileBrowser administrator credentials without printing them.

The API installs the official Codex CLI into the `cxsun-demo-codex-cli` volume on first start. The `cxsun-demo-codex-auth` volume keeps each tenant's device sign-in across container updates. To update the CLI later, run `sh .container/demo/update-codex-cli.sh` on the VPS from the repository root. Complete device sign-in in the app's Zetro settings.
