---
sidebar_position: 1
title: Project Overview
---

# Project Overview

CXSun is a TypeScript monorepo for a multi-tenant business operating system. The active runtime is split into a Node.js backend, a React frontend, a Docusaurus documentation app, and shared package workspaces.

## Workspace Shape

- `apps/server`: active backend API, database migrations, tenant runtime, queue runtime, and system operations.
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

Platform-owned data lives in the master database. Tenant-owned business data lives in isolated tenant databases. Runtime requests resolve the tenant from domain/session context before touching tenant data.
