---
sidebar_position: 1
title: Project Overview
---

# Project Overview

CXSun is a TypeScript monorepo for a multi-tenant business operating system. The current runtime has a combined Node.js backend, a React frontend, a Docusaurus documentation app, and shared package workspaces. The target cleanup direction is one repo with multiple backend services and independently deployable app units.

## Workspace Shape

- `apps/server`: current combined backend API, database migrations, tenant runtime, queue runtime, and system operations. This is a transition container, not the final backend shape.
- Future backend services: `platform-api`, `billing-api`, `ecommerce-api`, `crm-api`, `sites-api`, and `cxsync-api`.
- `apps/frontend`: active React and Vite dashboard for tenant, admin, and super-admin surfaces.
- `apps/docs`: Docusaurus project documentation site.
- `apps/cli`: local workflow helpers for builds, backups, release versioning, and cloud setup helpers.
- `packages/*`: shared, web, desktop, mobile, and UI package placeholders or shared utilities.
- `assist`: project operating notes, rules, changelog, context, and implementation records.

## Product Surfaces

- Public site and tenant-domain resolution.
- Tenant business workspace for operational modules.
- Admin and support surfaces.
- Super-admin platform orchestration for tenants, domains, database manager, queue manager, system update, and docs.
- Agent OS direction for helper, operator, workflow, planner, analytics, router, and memory capabilities.

## Primary Boundary

Platform-owned data lives in the master database. Tenant-owned business data lives in isolated tenant databases. The target tenant shape keeps one database per tenant, with `core_*` tables always present and optional app table groups such as `billing_*`, `ecommerce_*`, `crm_*`, and `sites_*`.

`platform-api` is the first extraction target. `billing-api` is the first business-service extraction target. The current `apps/server` must stay working until those replacements are verified.
