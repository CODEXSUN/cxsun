---
title: Database Manager
---

# Database Manager Module

Database Manager is the super-admin surface for database visibility and recovery actions.

## Responsibilities

- Show master database target.
- Show tenant database targets.
- Read installed database versions from `db_versions`.
- List database backups.
- Enqueue backup jobs.
- Start restore operations.

## Version Status

Tenant version status can be recorded, not recorded, or unreachable. A missing record means the database has not been migrated after version tracking was introduced.
