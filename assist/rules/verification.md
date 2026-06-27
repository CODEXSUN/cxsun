# Verification Rules

Run checks that match the files changed. Prefer targeted workspace checks during development and the full active check before finalizing meaningful changes.

## Standard Commands

- Full active check: `npm run check`
- Documentation/changelog policy check: `npm run check:docs-progress`
- Active typechecks only: `npm run typecheck:active`
- Active builds only: `npm run build:active`

## Required Checks By Change Type

Backend changes under `apps/server`:

- `npm -w apps/server run typecheck`
- `npm -w apps/server run build`

Frontend changes under `apps/frontend`:

- `npm -w apps/frontend run typecheck`
- `npm -w apps/frontend run build`
- For feature-visibility changes, verify both enabled and disabled states cover sidebar, shortcuts, overview, direct routes, and related settings.

Billing entry or print/mail changes:

- Verify the selected company and accounting year are respected.
- Verify list, show, upsert, print, and document-number behavior for the affected entry type.
- For PDF email delivery, verify the queued attachment matches the visible print and temporary files remain for retries but are deleted after successful delivery.

Shared package changes under `packages/shared`:

- `npm -w packages/shared run typecheck`
- Also run affected app typechecks when shared exports are consumed by apps.

Assist-only documentation changes:

- Run `rg` scans for stale paths when architecture or workflow guidance changes.
- Run `npm run check:docs-progress` when documentation, changelog, versioning, or workflow rules change.
- Run `npm run check` when command guidance or package assumptions change.

## Notes

- Do not treat `node_modules`, `dist`, build artifacts, lockfiles, or generated files as source files.
- Do not skip failing checks silently. Record what failed and why.
