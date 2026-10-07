# Codexsun

Codexsun is a standalone tenant app at `apps/codexsun/web`, served on port 7040.
It uses `MainLayout` from `@cxsun/ui/layouts/main-layouts` and fills the browser
viewport. It is separate from Platform Web on port 7020.

From the repository root, start it with:

```sh
npm run dev:codexsun
```

Every start replaces a previous Codexsun dev process on port 7040. An unrelated
listener is left alone.

Codexsun checks the Platform API tenant session, shows only applications enabled
for that tenant, and links to their current workspaces on Platform Web. The
Platform API must run on port 7010; sign-in and existing workspaces require
Platform Web on port 7020. App-owned routes can move into this standalone host
one at a time.

Optional root environment settings:

- `CXSUN_SHELL_PORT`: Codexsun port, default 7040.
- `CXSUN_SHELL_API_PORT`: Platform API port, default 7010.
- `CXSUN_SHELL_PLATFORM_WEB_ORIGIN`: existing Platform Web origin, default
  `http://127.0.0.1:7020`. Set this when building for another environment.
