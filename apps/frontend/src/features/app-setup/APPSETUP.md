# App Setup

## Summary
Guided multi-step wizard for provisioning a new tenant with database, admin user, and primary domain.

## What We Done
- `app-setup-page.tsx` — 4-step wizard (Tenant → Database → Domain → Review) with sidebar navigation and completion indicators. Tenant step: code, name, slug (auto-derived), admin name/email/password. Database step: name, server mode toggle (same/other server), conditional host/port/user/secret fields. Domain step: primary domain input. Review step: summary with all values. Auto-slugify and auto-database name derivation. Per-step validation and full submission validation. `createAppSetup` mutation with success/error toasts.
- `app-setup-client.ts` — `createAppSetup` API (POST /api/v1/setup/apps). Types: `AppSetupInput`, `AppSetupResult`.

## Gaps
- Single-use setup wizard — no tenant list or management after creation.
- No editing of existing tenant configuration.

## Future Concepts
- Tenant management dashboard (list, edit, suspend tenants).
- Multi-region / multi-cluster database configuration.
- Custom domain verification (DNS check) as a wizard step.
- Setup template / clone from existing tenant.
