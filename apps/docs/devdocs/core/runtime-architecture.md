---
sidebar_position: 2
title: Runtime Architecture
---

# Runtime Architecture

The backend uses a modular controller/service/database pattern with lightweight decorators for modules, controllers, dependency injection, and guards.

## Backend Runtime

- `core`: framework primitives, guards, tenant context, health, tenant, tenant-domain, industry, system update, queue manager, and database manager.
- `infrastructure`: master database connection, tenant database connection, auth helpers, queue runtime, and platform migrations.
- `modules`: business modules grouped by domain such as master data, entries, stock, settings, mail, media, ecommerce, and integrations.
- `framework/setup`: guided tenant setup flow.

## Frontend Runtime

The frontend is a React dashboard with role-aware routing:

- `super-admin`: platform orchestration and privileged admin tools.
- `admin`: software/support desk.
- `tenant`: tenant workspace modules and enabled app menus.

Dashboard pages are selected through URL path segments and mapped to module components in `dashboard-view.tsx`.

## Documentation Runtime

The documentation site is a separate Docusaurus app. The frontend links to it through the super-admin `Project Docs` page, and the backend exposes a guarded docs manifest API.
