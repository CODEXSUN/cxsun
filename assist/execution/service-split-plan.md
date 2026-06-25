# Service Split Plan

This execution note tracks the planned cleanup from a single active backend toward one repo with multiple independently deployable backend services.

## Goal

Allow a small fix in one app, such as Billing, to be tested and deployed without waiting for unfinished CXSync, Ecommerce, CRM, or Sites work.

## Target Services

- `platform-api`: platform and shared tenant foundation. This is the deployable service name for the earlier Core API concept.
- `billing-api`: billing workflows only.
- `ecommerce-api`: ecommerce workflows only.
- `crm-api`: CRM workflows only.
- `sites-api`: site/content workflows only.
- `cxsync-api`: database maintenance and migration safety only.

## Tenant Database Rule

Keep one database per tenant, with separated table groups:

```text
core_*       always present
billing_*    only if Billing is enabled
ecommerce_*  only if Ecommerce is enabled
crm_*        only if CRM is enabled
sites_*      only if Sites is enabled
```

## Implementation Order

1. Write architecture and AI rules.
2. Create module documents for Core, Billing, Ecommerce, CRM, Sites, and CXSync.
3. Audit current tables and classify them by target owner.
4. Add an app registry that records enabled apps per tenant.
5. Make tenant provisioning create `core_*` foundation first.
6. Prepare Platform API as the first independently deployable backend foundation.
7. Prepare Billing API as the first business service split.
8. Add Platform API and Billing Docker build/deploy paths.
9. Move Ecommerce-to-Billing interactions behind API commands.
10. Repeat for CRM, Sites, and CXSync.

## Safety Rules

- Do not rename existing live tables casually.
- New tables should follow the target owner prefix.
- Do not mix business schemas.
- Do not let one app import another app's internals.
- Shared behavior must move into Core or a documented shared package.
- CXSync remains isolated from business modules.

## Compatibility Rule

Keep `apps/server` working during the transition. Do not break the live combined backend until the replacement Platform API and Billing API services are proven with build, typecheck, API smoke tests, and deployment path checks.
