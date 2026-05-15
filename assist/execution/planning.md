# Session Plan

**Date:** 2026-05-14
**Version:** 1.0.08

## Objective

Add multi-theme support to the active Vite frontend, including blue, emerald, orange, and indigo theme presets plus light/dark/system mode handling.

## Phases

### Phase 1: Session orientation

- Read `assist/README.md`.
- Load relevant rules from `assist/rules/`.
- Load project context from `assist/context/`.
- Record the current user prompt for review.

### Phase 2: Ready state

- Inspect the real workspace structure.
- Update stale assist guidance.
- Verify assist files reference the current active apps and checks.
- Await the next implementation task.

### Phase 3: Frontend theme work

- Inspect current frontend theme wiring and shadcn configuration.
- Add a Vite theme provider using project storage keys.
- Add theme color variants for blue, emerald, orange, and indigo.
- Replace the existing binary theme switch with mode and color selection.
- Run frontend typecheck/build verification.

### Phase 4: Frontend startup performance

- Reproduce the frontend production build output.
- Remove the landing-page first-paint data loading gate.
- Ensure frontend builds use React production runtime even with local development env defaults.
- Verify local startup, browser console, and first paint timing.

### Phase 5: Tenant runtime architecture scan

- Trace URL/domain to tenant to tenant database runtime flow.
- Scan tenant-domain, tenant, industry, company, and auth API surfaces.
- Fix narrow blockers in tenant context resolution and protected tenant access.
- Update README and assist architecture guidance with the current persistence split.

### Phase 6: Dashboard role split

- Split dashboard modes into super-admin, admin, and tenant surfaces.
- Keep super-admin as platform orchestration.
- Keep admin focused on software operations, bugs, helpdesk, client notes, and updates.
- Keep tenant dashboard isolated to tenant database companies and roles.
- Verify typecheck/build/check without warnings.

### Phase 7: Dedicated dashboard URL families

- Split frontend route families into `/app`, `/admin`, and `/sa`.
- Add separate login routes and auth storage per surface.
- Keep `/app/company`, `/admin/company`, and `/sa/company` behavior distinct.
- Verify route guards, typecheck, build, and full check.

### Phase 8: Product picture

- Add a clear assist product picture for the software direction.
- Describe public site, tenant workspace, admin desk, and super-admin orchestration.
- Describe module roadmap and route/data boundaries.

### Phase 9: Super-admin domain management

- Add tenant domain master list, show page, and upsert page using the common list pattern.
- Add tenant-domain list/upsert API endpoints.
- Wire domain management into the super-admin sidebar and `/sa/tenant-domain` route.
- Verify frontend/server/full checks without warnings.

### Phase 10: Tenant common and master modules

- Read temp common/master module definitions and strict modular monolith, DDD, event-driven, and queue standards.
- Add individual tenant modules for each common/master area instead of one generic common module.
- Keep reusable code as shared module primitives, but give each common/master a removable module folder with domain, application, infrastructure, interface, and database shape.
- Add per-module tenant tables with integer auto-increment primary keys and an additional unique 8-character public UUID.
- Add common module pages with popup upsert/list behavior and master module pages with list/show/upsert behavior like the tenant master page.
- Wire tenant dashboard app routes to the individual module pages and verify server/frontend checks.

### Phase 11: Master-data contract hardening

- Add no-dependency contract verification for master-data module definitions and migration assumptions.
- Verify every common/master module has a unique individual table, valid key, and 8-digit public UUID contract.
- Expose a targeted script so the module contract can be checked before broader builds.

### Phase 12: Standalone master module split

- Split contact, product, and order out of the generic master-data route into standalone backend modules.
- Give each module its own domain definition, application service, repository adapter, controller, database migration export, and module registration.
- Route frontend master pages for contacts, products, and orders to the standalone module APIs.
- Keep the shared master-data code only as reusable primitives for later module splits.

### Phase 13: Master folder organization

- Move standalone contact, product, and order master modules under `apps/server/src/modules/master/`.
- Keep public API routes unchanged while updating internal imports and tenant provisioning.
- Verify the master-data contract and active builds after the move.

### Phase 14: Common folder organization

- Move common module definitions into `apps/server/src/modules/common/<group>/<module>/`.
- Keep shared master-data services as reusable primitives while sourcing definitions from the common registry.
- Update contract coverage to assert the grouped common folder pattern.
- Verify the common registry, backend typecheck, backend build, and frontend typecheck.

### Phase 15: Standalone common modules and foundation split

- Add a foundation module area for the shared master-record engine, event bus, repository, migration helper, and definition contracts.
- Convert every common definition folder into a standalone module with application, infrastructure, interface, database, and module registration files.
- Keep the `master-data` API as a compatibility registry for frontend common list screens.
- Wire standalone common modules into the app module and tenant provisioning path.
- Verify contract coverage, backend typecheck/build, and frontend typecheck.
