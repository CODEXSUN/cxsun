# Verification Rules

Run checks that match the files changed. Prefer targeted workspace checks during development and the full active check before finalizing meaningful changes.

## Standard Commands

- Full active check: `npm run check`
- Active typechecks only: `npm run typecheck:active`
- Active builds only: `npm run build:active`
- Assist script equivalent: `bash assist/scripts/check.sh`

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

Shared UI changes under `packages/ui`:

- `npm -w packages/ui run typecheck`
- Run affected app typechecks or builds when shared UI exports are consumed by apps.

Desktop, web, or mobile package changes:

- Run that workspace's `typecheck` script.
- Run additional app build/dev checks when the package becomes active or user-facing.

CXSync Desktop or CXSync Cloud changes:

- `npm -w apps/cxsync-cloud run test:contract`
- `npm -w apps/cxsync-cloud run typecheck`
- `npm -w apps/cxsync-cloud run build`
- `npm -w apps/cxsync run typecheck`
- `npm -w apps/cxsync run compile:electron`
- Run `npm -w apps/cxsync-cloud run test:integration` against a configured live service and master tenant when transport, authentication, handshake, or report persistence changes.

Assist-only documentation changes:

- Run `rg` scans for stale paths when architecture or workflow guidance changes.
- Run `npm run check` when command guidance or package assumptions change.

## Notes

- Do not treat `node_modules`, `dist`, build artifacts, lockfiles, or generated files as source files.
- Do not skip failing checks silently. Record what failed and why.
