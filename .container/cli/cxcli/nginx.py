"""Create and enable CXSun Nginx virtual hosts."""

from __future__ import annotations

import argparse
import os
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


DOMAIN_PATTERN = re.compile(r"^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$")


@dataclass(frozen=True)
class NginxSite:
    domain: str
    aliases: tuple[str, ...]
    backend_host: str
    backend_port: int
    frontend_host: str
    frontend_port: int
    ssl: bool

    @property
    def server_names(self) -> tuple[str, ...]:
        return tuple(dict.fromkeys((self.domain, *self.aliases)))

    @property
    def server_name_line(self) -> str:
        return " ".join(self.server_names)


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="codexsun",
        description="Create an Nginx site for a CXSun tenant domain.",
    )
    parser.add_argument("domain_arg", nargs="?", help="Domain name and config file name.")
    parser.add_argument("--domain", dest="domain_opt", help="Domain name and config file name.")
    parser.add_argument(
        "--aliases",
        default="",
        help="Comma-separated extra server names, for example www.example.com,shop.example.com.",
    )
    parser.add_argument(
        "--www",
        action="store_true",
        help="Add www.<domain> as an alias.",
    )
    parser.add_argument(
        "--no-default-www",
        action="store_true",
        help="Do not add www.<domain>. This is the default.",
    )
    parser.add_argument(
        "--no-www",
        action="store_true",
        help="Do not add www.<domain>. This is the default.",
    )
    parser.add_argument("--backend-host", default="127.0.0.1")
    parser.add_argument("--backend-port", type=int, default=6005)
    parser.add_argument("--frontend-host", default="127.0.0.1")
    parser.add_argument("--frontend-port", type=int, default=6010)
    parser.add_argument("--available-dir", default="/etc/nginx/sites-available")
    parser.add_argument("--enabled-dir", default="/etc/nginx/sites-enabled")
    parser.add_argument("--ssl", action="store_true", help="Write HTTPS config and issue certs when missing.")
    parser.add_argument(
        "--skip-certbot",
        action="store_true",
        help="Do not run certbot. Fails when --ssl is used and cert files are missing.",
    )
    parser.add_argument("--email", help="Email passed to certbot for non-interactive certificate issuance.")
    parser.add_argument("--force", action="store_true", help="Overwrite an existing site file or symlink.")
    parser.add_argument("--dry-run", action="store_true", help="Print the config and actions without writing.")
    parser.add_argument("--skip-nginx-test", action="store_true", help="Skip nginx -t.")
    parser.add_argument("--skip-reload", action="store_true", help="Skip reloading Nginx.")
    return parser.parse_args(argv)


def normalize_domain(raw_domain: str | None) -> str:
    if raw_domain is None:
        raise ValueError("domain is required")
    domain = raw_domain.strip().lower().rstrip(".")
    if not DOMAIN_PATTERN.match(domain):
        raise ValueError(f"invalid domain: {raw_domain}")
    return domain


def parse_aliases(domain: str, raw_aliases: str, add_default_www: bool, force_www: bool) -> tuple[str, ...]:
    aliases: list[str] = []
    if force_www or (add_default_www and should_add_default_www(domain)):
        aliases.append(f"www.{domain}")

    for raw_alias in raw_aliases.split(","):
        alias = raw_alias.strip()
        if not alias:
            continue
        aliases.append(normalize_domain(alias))

    return tuple(alias for alias in dict.fromkeys(aliases) if alias != domain)


def should_add_default_www(domain: str) -> bool:
    return not domain.startswith("www.") and len(domain.split(".")) == 2


def render_proxy_headers(include_cookie_clear: bool = False, include_forwarded_host: bool = True) -> str:
    lines = [
        "        proxy_set_header Host $host;",
    ]
    if include_cookie_clear:
        lines.append('        proxy_set_header Cookie "";')
    if include_forwarded_host:
        lines.append("        proxy_set_header X-Forwarded-Host $host;")
    lines.extend(
        [
            "        proxy_set_header X-Real-IP $remote_addr;",
            "        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "        proxy_set_header X-Forwarded-Proto $scheme;",
        ]
    )
    return "\n".join(lines)


def render_application_locations(site: NginxSite) -> str:
    backend_url = f"http://{site.backend_host}:{site.backend_port}"
    frontend_url = f"http://{site.frontend_host}:{site.frontend_port}"
    storage_headers = render_proxy_headers(include_cookie_clear=True)
    backend_headers = render_proxy_headers()
    health_headers = render_proxy_headers(include_forwarded_host=False)
    frontend_headers = render_proxy_headers(include_forwarded_host=False)
    return f"""    large_client_header_buffers 8 32k;
    client_header_buffer_size 16k;

    location /storage/ {{
        proxy_pass {backend_url};
{storage_headers}
    }}

    location /api/ {{
        proxy_pass {backend_url};
{backend_headers}
    }}

    location /health {{
        proxy_pass {backend_url};
{health_headers}
    }}
    location / {{
        proxy_pass {frontend_url};
{frontend_headers}
    }}"""


def render_http_proxy_config(site: NginxSite) -> str:
    return f"""server {{
    listen 80;
    server_name {site.server_name_line};

{render_application_locations(site)}
}}
"""


def render_ssl_config(site: NginxSite) -> str:
    return f"""server {{
    listen 80;
    server_name {site.server_name_line};

    return 301 https://$host$request_uri;
}}

server {{
    listen 443 ssl http2;
    server_name {site.domain};

    ssl_certificate /etc/letsencrypt/live/{site.domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{site.domain}/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

{render_application_locations(site)}
}}
"""


def render_config(site: NginxSite) -> str:
    if site.ssl:
        return render_ssl_config(site)
    return render_http_proxy_config(site)


def certificate_paths(domain: str) -> tuple[Path, Path]:
    live_dir = Path("/etc/letsencrypt/live") / domain
    return live_dir / "fullchain.pem", live_dir / "privkey.pem"


def certificates_exist(domain: str) -> bool:
    fullchain, privkey = certificate_paths(domain)
    return fullchain.exists() and privkey.exists()


def require_root_for_system_paths(*paths: Path) -> None:
    if os.name == "nt":
        return
    if os.geteuid() == 0:
        return
    if any(str(path).startswith("/etc/") for path in paths):
        raise PermissionError("run with sudo/root when writing under /etc, for example: sudo python3 .container/cli/codexsun.py example.com --ssl")


def write_site_file(path: Path, content: str, force: bool) -> None:
    if path.exists() and not force:
        raise FileExistsError(f"{path} already exists. Use --force to overwrite it.")
    path.parent.mkdir(parents=True, exist_ok=True)
    temp_path = path.with_name(f".{path.name}.tmp")
    temp_path.write_text(content, encoding="utf-8")
    os.replace(temp_path, path)


def enable_site(available_path: Path, enabled_path: Path, force: bool) -> None:
    enabled_path.parent.mkdir(parents=True, exist_ok=True)
    if enabled_path.exists() or enabled_path.is_symlink():
        if not force:
            if enabled_path.is_symlink() and Path(os.readlink(enabled_path)) == available_path:
                return
            raise FileExistsError(f"{enabled_path} already exists. Use --force to replace it.")
        enabled_path.unlink()
    enabled_path.symlink_to(available_path)


def run_command(command: Sequence[str], *, dry_run: bool) -> None:
    printable = " ".join(command)
    if dry_run:
        print(f"[dry-run] {printable}")
        return
    subprocess.run(command, check=True)


def run_nginx_test(skip: bool, dry_run: bool) -> None:
    if skip:
        print("Skipping nginx -t.")
        return
    run_command(["nginx", "-t"], dry_run=dry_run)


def reload_nginx(skip: bool, dry_run: bool) -> None:
    if skip:
        print("Skipping Nginx reload.")
        return
    try:
        run_command(["systemctl", "reload", "nginx"], dry_run=dry_run)
    except (subprocess.CalledProcessError, FileNotFoundError):
        run_command(["nginx", "-s", "reload"], dry_run=dry_run)


def run_certbot(site: NginxSite, email: str | None, dry_run: bool) -> None:
    command = ["certbot", "--nginx"]
    for server_name in site.server_names:
        command.extend(["-d", server_name])
    if email:
        command.extend(["--non-interactive", "--agree-tos", "-m", email])
    run_command(command, dry_run=dry_run)


def print_dry_run(site: NginxSite, available_path: Path, enabled_path: Path) -> None:
    print(f"Domain: {site.domain}")
    print(f"Server names: {site.server_name_line}")
    print(f"Available file: {available_path}")
    print(f"Enabled symlink: {enabled_path}")
    print("")
    print(render_config(site))


def build_site(args: argparse.Namespace) -> NginxSite:
    raw_domain = args.domain_opt or args.domain_arg
    domain = normalize_domain(raw_domain)
    aliases = parse_aliases(domain, args.aliases, False, args.www)
    return NginxSite(
        domain=domain,
        aliases=aliases,
        backend_host=args.backend_host,
        backend_port=args.backend_port,
        frontend_host=args.frontend_host,
        frontend_port=args.frontend_port,
        ssl=args.ssl,
    )


def apply_site(args: argparse.Namespace, site: NginxSite) -> None:
    available_path = Path(args.available_dir) / site.domain
    enabled_path = Path(args.enabled_dir) / site.domain

    if args.dry_run:
        print_dry_run(site, available_path, enabled_path)
        if site.ssl and not certificates_exist(site.domain) and not args.skip_certbot:
            print("Certificate is missing; first real run will enable HTTP temporarily, run certbot, then write HTTPS config.")
        return

    require_root_for_system_paths(available_path, enabled_path)

    needs_certbot = site.ssl and not certificates_exist(site.domain)
    if needs_certbot and args.skip_certbot:
        fullchain, privkey = certificate_paths(site.domain)
        raise FileNotFoundError(f"SSL certificate files are missing: {fullchain}, {privkey}")

    if needs_certbot:
        print("Certificate is missing. Enabling temporary HTTP proxy config for certbot.")
        temporary_site = NginxSite(
            domain=site.domain,
            aliases=site.aliases,
            backend_host=site.backend_host,
            backend_port=site.backend_port,
            frontend_host=site.frontend_host,
            frontend_port=site.frontend_port,
            ssl=False,
        )
        write_site_file(available_path, render_config(temporary_site), args.force)
        enable_site(available_path, enabled_path, args.force)
        run_nginx_test(args.skip_nginx_test, args.dry_run)
        reload_nginx(args.skip_reload, args.dry_run)
        run_certbot(site, args.email, args.dry_run)

    write_site_file(available_path, render_config(site), args.force or needs_certbot)
    enable_site(available_path, enabled_path, args.force or needs_certbot)
    run_nginx_test(args.skip_nginx_test, args.dry_run)
    reload_nginx(args.skip_reload, args.dry_run)

    print(f"Nginx site is ready: {available_path}")
    print(f"Enabled at: {enabled_path}")


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv)
    try:
        site = build_site(args)
        apply_site(args, site)
    except (FileExistsError, FileNotFoundError, PermissionError, ValueError) as error:
        print(f"codexsun: {error}", file=sys.stderr)
        return 1
    except subprocess.CalledProcessError as error:
        print(f"codexsun: command failed with exit code {error.returncode}: {' '.join(error.cmd)}", file=sys.stderr)
        return error.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
