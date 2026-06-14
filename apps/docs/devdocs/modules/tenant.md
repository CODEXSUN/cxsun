---
title: Tenant
---

# Tenant Module

Tenant manages platform tenant records and tenant database lifecycle actions.

## Responsibilities

- Create, update, list, show, suspend, and restore tenants.
- Store tenant database connection metadata.
- Track company counts and active company metrics.
- Setup tenant client databases.
- Reset tenant databases through super-admin confirmation.

## Database

Tenant records live in the master database. Tenant-owned operational data lives in each tenant database.
