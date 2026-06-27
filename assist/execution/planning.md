# Session Plan

<<<<<<< Updated upstream
The active clean plan is now maintained in:
=======
**Date:** 2026-06-26
**Batch:** #128
**Focus:** Clean the repository to the active billing app and make local commands work on this computer.
>>>>>>> Stashed changes

- `assist/execution/plan.md`

<<<<<<< Updated upstream
Use `assist/execution/task.md` for the current checklist.

Historical implementation notes were intentionally removed from this active file to keep the next Platform API work focused.
=======
1. Keep only the active server, frontend, shared package, and CLI helper workspaces.
2. Remove stale root scripts for deleted docs, product apps, desktop, mobile, CXSync, and placeholder packages.
3. Update runtime/build/preflight helpers so they only target server and frontend.
4. Update assist and root documentation to describe the cleaned billing workspace.
5. Remove leftover unused app/package folders.
6. Regenerate npm workspace metadata and verify install, typecheck, build, and check.

## Verification

- `npm install`
- `npm run typecheck:active`
- `npm run build:active`
- `npm run check`
>>>>>>> Stashed changes
