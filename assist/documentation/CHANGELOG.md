# Changelog

## Version State

- **Current version:** `1.0.09`
- **Release tag:** `v-1.0.09`
- **Changelog label:** `v 1.0.09`

---

## v-1.0.09

### [v 1.0.09] 2026-05-14 - frontend shell and sync tooling

## v-1.0.09

### [v 1.0.09] 2026-05-14 - align assist guidance to active app layout

- Updated assist architecture guidance to use `apps/server` and `apps/frontend` as active implementation targets
- Documented placeholder status for `packages/web` and `packages/mobile`
- Updated AI coding rules, default agent guidance, PR template, and assist check script for the current workspace pattern
- Added architecture context decision records for the active app structure

### [v 1.0.09] 2026-05-14 - make assist verification self-contained

- Added workspace map, verification rules, and server module template for future AI-assisted work
- Added root `check`, `typecheck:active`, and `build:active` scripts
- Added minimal reserved package entrypoints so web and mobile placeholders typecheck cleanly
- Updated assist check and PR guidance to include all typecheckable workspaces

### [v 1.0.09] 2026-05-14 - replace starter frontend and root readme

- Replaced the Vite starter screen with a CXSun operations dashboard shell
- Added tenant, module, workflow, and backend health surfaces to the frontend
- Updated the root README to document the real monorepo layout and commands
- Fixed constructor injection metadata lookup so the health endpoint resolves its service correctly

### [v 1.0.09] 2026-05-14 - add landing site, Tailwind, shadcn UI, and SQLite API

- Moved frontend CSS into `apps/frontend/src/assets/css`
- Added Tailwind CSS, shadcn-style UI primitives, lucide icons, and a theme switch
- Reworked the frontend into a landing page with top navigation, footer, about, services, contact, and blog surfaces
- Added Kysely with SQLite at `storage/database/cxsun.sqlite`
- Added backend site content and contact endpoints consumed by the frontend

### [v 1.0.09] 2026-05-14 - wire official shadcn login and dashboard blocks

- Added the `shadcn` CLI package to the frontend workspace
- Installed and wired the official `login-01` block
- Attempted `dashboard-07`, but the current official registry does not expose that item; wired the available official `dashboard-01` block instead
- Added generated shadcn sidebar, chart, table, form, and navigation primitives to the frontend
- Added frontend path aliases required by generated shadcn imports

### [v 1.0.09] 2026-05-14 - force frontend dev host binding

- Updated Vite config and frontend preflight launch to bind dev/preview to `0.0.0.0`
- Verified the frontend responds on `127.0.0.1:6000`

### [v 1.0.09] 2026-05-14 - move frontend away from unsafe browser port

- Changed the frontend dev port from `6000` to `6010` because Chromium blocks `6000` with `ERR_UNSAFE_PORT`
- Updated Vite defaults, preflight defaults, `.env.sample`, local `.env`, and docs

### [v 1.0.09] 2026-05-14 - normalize frontend API base URL

- Updated `VITE_API_BASE_URL` to point at the backend origin instead of `/api`
- Added frontend API base normalization so both origin and `/api` suffixed values resolve correctly

### [v 1.0.09] 2026-05-14 - wire shadcn sidebar-07 to dashboard

- Added official `sidebar-07` block through the shadcn CLI
- Kept the existing app surfaces unchanged and wired the generated sidebar through the existing dashboard sidebar import

### [v 1.0.09] 2026-05-14 - initialize shadcn b0 Vite monorepo preset

- Ran `npx shadcn@latest init --preset b0 --template vite --monorepo --pointer`
- Added `apps/web` and `packages/ui` compatibility workspaces expected by the shadcn monorepo preset
- Updated shadcn config to `radix-nova` with neutral base styling
- Added preset-required CSS imports and dependencies
- Included the new compatibility workspaces in the standard typecheck flow

### [v 1.0.09] 2026-05-14 - port 6000 frontend 6001 backend with preflight port check

- Added preflight port check scripts (`preflight.mjs`, `preflight-port.mjs`) to verify port availability before starting dev servers
- Configured frontend dev server on port 6000
- Configured backend server on port 6001
- Updated Vite config for dev server proxy and port
- Updated `.env.sample` with port configuration

## v-1.0.09

### [v 1.0.09] 2026-05-14 - add graceful shutdown and error resilience to server

- Added graceful shutdown handlers for SIGTERM and SIGINT signals
- Implemented proper cleanup on server close (DB connections, open handles)
- Added error resilience middleware for uncaught exceptions and unhandled rejections
- Improved server startup with port conflict detection

## v-1.0.09

### [v 1.0.09] 2026-05-14 - add fastify server with health route and concurrently dev

- Added Fastify as the server framework with TypeScript support
- Implemented health check route (`GET /health`)
- Added `concurrently` for parallel dev script running server and frontend
- Updated `package.json` with `dev`, `dev:server`, `dev:frontend` scripts
- Updated frontend Vite config for proxy to backend

## v-1.0.09

### [v 1.0.09] 2026-05-14 - fix frontend duplicate workspace conflict

- Removed duplicate server package from `packages/server/` that conflicted with `apps/server/`
- Resolved workspace naming collision between `packages/server` and `apps/server`
- Consolidated all server code into `apps/server/` only

## v-1.0.09

### [v 1.0.09] 2026-05-14 - removed version from commit message

- Removed version number from commit message template
- Updated changelog format to match new convention
- Refactored commit template to `#<ref> <description>` format

## v-1.0.09

### [v 1.0.09] 2026-05-14 - normalized all version refs

- Standardized version reference format across all 15 `package.json` files
- Updated README, changelog, templates, and `index.html` for version consistency
- Synced version strings across root workspace and all sub-packages

## v-1.0.09

### [v 1.0.09] 2026-05-14 - updated log

- Refactored commit message format to use structured reference
- Updated commit template to `#<ref> v<version> <description> as #<ref> - <title>`

## v-1.0.09

### [v 1.0.09] 2026-05-14 - init new application

- Added `assist/` directory with AI agent rules, templates, scripts, context, and agent configs
- Added `CHANGELOG.md` for versioned action tracking
- Added version display to the application UI
- Updated `index.html` with version meta tag
- Updated commit template to use `#<number> <message>` format
