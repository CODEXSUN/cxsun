---
sidebar_position: 3
title: Database And Tenancy
---

# Database And Tenancy

CXSun separates platform data from tenant-owned business data.

## Master Database

The master database stores:

- Site content.
- Industries.
- Tenants.
- Tenant domains.
- Admin users.
- Platform RBAC policy catalog.
- Tenant policy toggles.
- Queue jobs and runtime settings.
- Database version records for master install state.

## Tenant Databases

Each MariaDB-backed tenant owns a separate database. Tenant databases store:

- Companies and company child records.
- Default company and accounting year context.
- Tenant-local users and role policy assignments.
- Common master data.
- Entries, reports, settings, integrations, media, mail, and app module records.
- Database version records for installed tenant database state.

## Version Tracking

The `db_versions` table exists in the master database and in each tenant database. It records installed application database version, target key, source, timestamps, and metadata. Database Manager reads these records to show master and tenant installed versions.
