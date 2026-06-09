# CXSun Nginx CLI

This helper creates one Nginx site file per tenant domain and enables it for the CXSun cloud app.

## Location

Run from the CXSun repository on the cloud server:

```bash
cd /workspace/cxsun
```

## Basic Usage

Check the generated Nginx config without writing files:

```bash
python3 .container/cli/codexsun.py tirupurconnect.com --ssl --dry-run
```

Create or refresh the real Nginx site:

```bash
sudo python3 .container/cli/codexsun.py tirupurconnect.com --ssl --force
```

The same command can be written with an explicit domain option:

```bash
sudo python3 .container/cli/codexsun.py --domain tirupurconnect.com --ssl --force
```

## Install Short Command

Create a server command named `codexsun`:

```bash
sudo ln -sf /workspace/cxsun/.container/cli/codexsun.py /usr/local/bin/codexsun
sudo chmod +x /workspace/cxsun/.container/cli/codexsun.py
```

Then run:

```bash
sudo codexsun tirupurconnect.com --ssl --force
```

## What It Does

For `tirupurconnect.com`, the CLI:

- writes `/etc/nginx/sites-available/tirupurconnect.com`
- links `/etc/nginx/sites-enabled/tirupurconnect.com`
- runs `nginx -t`
- reloads Nginx
- runs Certbot when `--ssl` is used and the certificate files do not exist

When `--ssl` is used and the Let's Encrypt files do not exist yet, the CLI first writes a temporary HTTP proxy config, enables it, tests and reloads Nginx, runs Certbot, then writes the final HTTPS redirect and SSL proxy config.

## Routing

Default CXSun routing:

```text
/storage/ -> http://127.0.0.1:6005 with Cookie cleared
/api/     -> http://127.0.0.1:6005
/health   -> http://127.0.0.1:6005
/         -> http://127.0.0.1:6010
```

## Domain Rules

By default, the CLI uses only the domain you pass.

For a root domain such as `tirupurconnect.com`, this means the config uses only `tirupurconnect.com`.

For a subdomain such as `office.aaran.org`, this means the config uses only `office.aaran.org`.

If a root domain should also use `www`, pass `--www`:

```bash
sudo python3 .container/cli/codexsun.py tirupurconnect.com --ssl --www --force
```

The `--no-www` option is accepted for clarity, but it is already the default:

```bash
sudo python3 .container/cli/codexsun.py dealodeal.com --ssl --no-www --force
```

Add extra aliases when needed:

```bash
sudo python3 .container/cli/codexsun.py thetirupurtextiles.com --ssl --aliases www.thetirupurtextiles.com,shop.thetirupurtextiles.com --force
```

## Common Tenant Commands

```bash
sudo python3 .container/cli/codexsun.py tirupurconnect.com --ssl --www --force
sudo python3 .container/cli/codexsun.py tenkasisports.com --ssl --www --force
sudo python3 .container/cli/codexsun.py tirupurdirect.com --ssl --www --force
sudo python3 .container/cli/codexsun.py thetirupurtextiles.com --ssl --www --force
sudo python3 .container/cli/codexsun.py dealodeal.com --ssl --www --force
sudo python3 .container/cli/codexsun.py aaran.org --ssl --www --force
sudo python3 .container/cli/codexsun.py office.aaran.org --ssl --force
```

Subdomain-only examples:

```bash
sudo python3 .container/cli/codexsun.py office.aaran.org --ssl --force
sudo python3 .container/cli/codexsun.py shop.thetirupurtextiles.com --ssl --force
```

## Options

```text
--domain <domain>        Domain name when not using the positional argument.
--aliases <list>         Comma-separated extra server names.
--www                    Add www.<domain> as an alias.
--no-www                 Do not add www.<domain>. This is the default.
--no-default-www         Do not add www.<domain>. This is the default.
--backend-port <port>    Backend port, default 6005.
--frontend-port <port>   Frontend port, default 6010.
--ssl                    Write HTTPS config and request certificates when missing.
--email <email>          Certbot email for non-interactive SSL setup.
--skip-certbot           Do not run Certbot.
--force                  Overwrite an existing Nginx site file or symlink.
--dry-run                Print config and actions without writing files.
--skip-nginx-test        Skip nginx -t.
--skip-reload            Skip Nginx reload.
```
