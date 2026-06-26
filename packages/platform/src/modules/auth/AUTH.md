# AUTH

## Summary
Handles authentication and user management for both tenant users and platform-level admin users. Supports login via email/password with tenant corporate ID, JWT session validation, and RBAC-based user creation and management across tenants and admin surfaces.

## What We Done
- Tenant user login with corporate ID, email, and password verification against tenant databases
- Platform user login (admin/super-admin surfaces) against the central `admin_users` table
- JWT session validation with tenant and platform identity sources
- Session persistence and validation on subsequent requests
- User management: create, update, and list tenant users within a tenant context
- Admin user management: create, update, list platform admin users (super-admin, software-admin, etc.)
- Domain-based tenant resolution via `x-login-domain` header
- RBAC policy seeding (`company.manage`, `rbac.manage`, `mail.manage`) for active tenants
- Platform database migrations for `admin_users`, `rbac_policies`, `tenant_rbac_policies`

## Gaps
- No role-based permission enforcement beyond identity checks (policies exist but are not consumed by services)
- No multi-tenant user switching (single-tenant login model)
- No password reset or forgot-password flow
- No OAuth/social login integration
- No MFA/2FA support
- No email verification flow
- No rate limiting on login attempts
- No session revocation/blacklist

## Future Concepts
- Policy-based authorization using the seeded RBAC tables
- Multi-tenant user access with tenant switching in JWT
- Password reset with email-based token flow
- OAuth 2.0 / SSO integration
- Login audit trail with failed attempt tracking
- Session management UI (list active sessions, force logout)
- Invitation-based user registration
