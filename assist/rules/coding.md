# Coding Rules

## General

- Use existing libraries and utilities. Do not add new dependencies unless necessary.
- Prefer editing existing files over creating new ones.
- Use TypeScript types properly. Avoid `any`.
- Components should be small and focused.
- Use async/await over raw promises.
- Handle errors gracefully. Do not silently swallow failures.

## File Size

- Source files must not exceed 700 lines.
- Preferred range is 500 lines or fewer.
- Files from 500 to 700 lines are allowed only when cohesive and hard to split without harming clarity.
- Any file approaching 500 lines must be reviewed for extraction into smaller modules.
- Files over 700 lines must be split before the change is complete.
- Generated files, lockfiles, build artifacts, and vendor files are exempt.

## Complexity

- Keep solutions simple and easy to reason about.
- If a function or module is getting complex, break it down.

## Readability

- Code must be clean, neat, and easy to scan.
- Keep functions small and focused on one responsibility.
- Prefer descriptive names over comments that explain unclear code.
- Use comments only for non-obvious decisions, domain rules, or complex integration behavior.
- Avoid deeply nested conditionals; extract guard clauses or small private helpers.
- Keep imports organized and remove unused code immediately.
- Keep public APIs explicit with clear types.
- Avoid large mixed-purpose files that combine transport, application, domain, and infrastructure concerns.

## Formatting

- Follow the repository's Prettier and ESLint configuration when present.
- Keep related code grouped in a predictable order.
- Use blank lines to separate logical sections, not to pad files.
- Prefer readable formatting over compressed cleverness.
- Do not use dense one-line implementations when they reduce clarity.

## Active Work Areas

- Put active backend work under `apps/server`.
- Put active frontend work under `apps/frontend`.
- Put shared framework-free code under `packages/shared`.
- Put shared reusable UI primitives, rich editors, dashboard shell components, and design-system helpers under `packages/ui`.
- Use `apps/cli` for workflow helpers.
<<<<<<< Updated upstream
- Treat `packages/web` and `packages/mobile` as placeholders unless the user explicitly asks to activate them.
- Treat `packages/desktop` as the active Electron desktop package.
=======
>>>>>>> Stashed changes

## Architecture

- The current backend is a combined transition server. Keep module boundaries strict so Platform API and Billing API can be extracted into separate backend services.
- Follow Domain-Driven Design for business modules: each module represents a bounded context/domain.
- Use events or explicit public contracts for cross-module behavior.
- Do not import another module's internals directly.
<<<<<<< Updated upstream
- Keep owned products and industry apps in the same repo by default. Separate the app experience with app workspaces, routes, ports, domains, and later service deploy units when needed; do not duplicate billing, accounting, compliance, mail, files, CRM, sites/blog, auth, tenant/company, or ZETRO logic inside each app.
- App-specific modules must request shared transaction behavior through the owning service or engine. For example, ecommerce, auditor, sports, learning, welfare, B2B Connect, and industry apps should call billing/accounting contracts for invoices, receipts, vouchers, postings, and reports.
=======
- Keep the active billing app focused. Add a new workspace only when it has a clear runtime, scripts, and verification path.
- App-specific modules must request shared transaction behavior through server-owned services/engines instead of duplicating invoice, receipt, voucher, posting, mail, or report logic.
>>>>>>> Stashed changes
- Keep `@cxsun/shared` limited to types, constants, and pure utilities.
- Frontend module pages must be standalone feature pages routed explicitly from the dashboard/router.
- Keep module-specific UI logic inside that module's feature folder. Do not add product/contact/company/sales-specific switches to generic master-data or common-data pages.
- For transaction-heavy frontend modules, keep query keys/query functions, business actions, and mutation invalidation maps in explicit module files such as `<module>-queries.ts`, `<module>-actions.ts`, and `<module>-invalidations.ts`. Page components should compose these contracts instead of owning scattered API calls and cache keys directly.
- Mutations that affect posting, dashboard totals, reports, document numbers, or compliance state must call a module invalidation helper so dependent screens revalidate together.
- When wiring a company feature toggle, centralize the enabled decision at the dashboard shell and pass it into navigation, overview, routing, and settings surfaces. Avoid separate unsynchronized local checks.
- Keep copied transaction modules independent after creation. Export Sales may reuse Sales patterns, but changes must preserve its separate routes, persistence tables, document numbering, currency fields, and feature visibility.

## Database Identity

- New database tables must use `id INT AUTO_INCREMENT PRIMARY KEY` as the internal primary key.
- New database tables must also include `uuid CHAR(8) NOT NULL UNIQUE` as the public identifier.
- Internal code should use `id` for joins and foreign keys; API/frontend/public references should use `uuid`.
- Generate public UUIDs through the shared public UUID helper so new IDs are uppercase alphanumeric, not numeric-only.
- Keep the current public UUID length at 8 characters. Plan a deliberate move to 16 characters when the product grows enough to need a larger public id space.

## Backend Module Structure

New or expanded business modules should follow this shape:

```
apps/server/src/modules/<group-or-boundary>/<module-name>/
├── domain/           # Entities, value objects, domain events
├── application/      # Use cases, application services, DTOs
├── infrastructure/   # Repositories, external adapters, database
│   └── database/
│       ├── migrations/
│       └── seeders/
├── interface/        # Controllers, resolvers, middleware
├── <module>.module.ts
└── index.ts          # Public API only
```

The existing `health` module has a few flat files from early bootstrap work. Do not use that as the pattern for larger business modules.
