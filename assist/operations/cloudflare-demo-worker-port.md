# Cloudflare demo Worker port

## Goal

Run the complete CXSUN demo at `demo.codexsun.com` on a separate Cloudflare Worker.
Use Cloudflare D1 for the platform and the single demo tenant. Use the demo sign-in
accounts from the local `.env` file. Keep all secrets out of source control and the
browser bundle.

## Current boundary

- Platform Web produces static files and calls the same-origin `/api/app` API.
- Platform API runs as a long-lived Fastify process. It provisions MariaDB databases
  before it registers the product routes.
- Platform and tenant data use separate MariaDB connections. The demo must keep this
  isolation with separate D1 bindings.
- The root `.env` selects `DB_DRIVER=mariadb`. The API rejects `sqlite` as a driver.
- Product migrations and queries use MariaDB SQL, including `AUTO_INCREMENT`,
  `ON DUPLICATE KEY UPDATE`, and `ALTER TABLE` operations.
- The API also uses a queue worker, local file storage, and optional Redis. A Worker
  needs separate Cloudflare services for the features that the demo enables.

## Cloudflare state on 2026-10-08

- The `cxsun-demo` Worker has two D1 bindings: `PLATFORM_DB` and `TENANT_DB`.
- Both D1 databases accepted a remote `SELECT 1` query.
- The Worker has no active route, custom domain, or uploaded application secret.
- The Worker returns `pending_port` until the full API and schema run on D1.

## Port sequence

1. Add a Worker request entry point and serve the existing Platform Web build as
   static assets. Preserve the `/api/app` browser API contract.
2. Add D1 database bindings for the platform and the single demo tenant. Keep tenant
   selection on the server and reject requests without a valid tenant session.
3. Convert the platform schema and seeds to SQLite. Verify sign-in, sessions,
   password recovery, tenant resolution, and application access.
4. Convert each enabled product module's schema, queries, and seeds. Verify its
   create, read, update, delete, and permission flows against D1.
5. Move persistent uploads to R2. Move enabled background jobs to a Worker-safe
   queue and scheduler. Disable only integrations that the demo does not enable.
6. Store `.env` passwords and keys as Worker secrets. Set non-secret demo config as
   Worker variables. Never upload the `.env` file as a static asset.
7. Deploy to a temporary `workers.dev` address. Pass the runtime checks below.
8. Bind `demo.codexsun.com` as the Worker's custom domain and repeat the checks on
   the public address.

## Release checks

- The public web page loads assets without a browser console error.
- Tenant context resolves for `demo.codexsun.com`.
- The configured demo account can sign in and sign out. A bad password fails.
- Session renewal and authorization work for both platform and tenant routes.
- Every enabled app completes a representative write and read against its D1 data.
- A user cannot select another tenant database through request headers.
- Upload, download, queued work, and mail work when those features are enabled.
- A Worker restart preserves records, sessions, and uploaded files.
- The domain routes to the new Worker, and health checks return JSON from the API.

Do not publish a static-only build as a full demo. Do not route demo API requests to
the existing production app or copy live tenant data into D1.
