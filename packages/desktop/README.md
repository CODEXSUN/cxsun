# CXSun Desktop

The desktop workspace packages the active React frontend as a Windows Electron application.

## Runtime modes

- Development: map `codexsun.local` with `npm run hosts:local`, set `ELECTRON_DEV_SERVER_URL=http://codexsun.local:6010`, start the normal server/frontend development processes, then run `npm run dev:desktop`.
- Packaged: run `npm run build:desktop`. Electron Builder compiles the frontend, embeds it in the installer, and serves it from a loopback-only local web server opened as `http://codexsun.local:<local-port>`.

The packaged UI opens without internet access. Business data remains server-owned, so normal ERP operations require the CXSun API and MariaDB to be available on the same machine or local network.

The desktop client uses `http://codexsun.local:6005` by default so tenant/domain resolution follows the same host-based path as the web app. Set `ELECTRON_API_BASE_URL` before launching the app to use another API address.

Set `ELECTRON_APP_HOST` only when a client machine needs a different local tenant host for the packaged UI.

On startup, the app checks whether the configured desktop host resolves to loopback. If it does not, the app opens a local diagnostics page with the hosts entry to add, instead of failing on a blank browser error.

## Commands

```powershell
npm run dev:desktop
npm run build:desktop
npm -w packages/desktop run e2e
```

Windows installers are written to `build/desktop`.
