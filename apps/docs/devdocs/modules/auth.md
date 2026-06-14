---
title: Auth
---

# Auth Module

Auth manages platform login, tenant login, JWT issuing, session refresh, and admin-user management.

## Responsibilities

- Authenticate super-admin and software-admin users from the master `admin_users` table.
- Authenticate tenant users from tenant-local `users` and `user_tenants`.
- Issue role-aware JWTs with selected tenant context.
- Provide user manager APIs for platform and tenant users.

## Notes

Platform guards require platform identity for super-admin APIs. Tenant APIs resolve tenant context before accessing tenant databases.
