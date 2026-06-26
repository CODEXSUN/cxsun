# TASK 8 - Frontend Vite Tailwind Shadcn And Package Stack

Execute this task after Task 7 is complete.

Do not create business forms, business tables, or business workflows in this task.

## Objective

Complete the frontend foundation stack for CODEXSUN before any business app UI starts.

This task makes the design system from Task 5 executable with Vite, Tailwind CSS, shadcn/ui conventions, TanStack Query, TanStack Table, and the approved frontend package set.

## Boundary

Allowed:

- root workspace package setup
- shared UI package setup
- Platform web frontend setup
- frontend configuration
- frontend test setup
- frontend package documentation

Not allowed:

- business screens
- business forms
- business tables
- app-specific workflow pages
- invoice, billing, ecommerce, CRM, task, audit, or industry modules

## Required ownership

Use this ownership:

```text
packages/ui/                 shared UI primitives and design system
packages/contracts/          shared frontend/backend contracts
packages/config/             shared lint, tsconfig, test, and build config
apps/platform/web/           Platform frontend shell
apps/<app-name>/web/         future app frontend shell
```

No app may copy UI primitives from another app.

Every app must consume shared UI through `packages/ui`.

## Stage 1 - Frontend runtime stack

Add and configure:

- [ ] React.
- [ ] React DOM.
- [ ] TypeScript.
- [ ] Vite.
- [ ] `@vitejs/plugin-react`.
- [ ] React compiler support only if approved and stable for the selected React version.
- [ ] Root TypeScript config inheritance.
- [ ] Vite path aliases.
- [ ] Environment variable typing.
- [ ] Source map rule for development.
- [ ] Production build output rule.

Required scripts:

```json
{
  "dev:platform:web": "npm -w apps/platform/web run dev",
  "build:platform:web": "npm -w apps/platform/web run build",
  "typecheck:platform:web": "npm -w apps/platform/web run typecheck",
  "test:platform:web": "npm -w apps/platform/web run test"
}
```

## Stage 2 - Tailwind CSS setup

Add and configure:

- [ ] Tailwind CSS.
- [ ] Vite Tailwind integration.
- [ ] Shared Tailwind entry CSS.
- [ ] CSS variable token strategy.
- [ ] Light theme variables.
- [ ] Dark theme variables.
- [ ] Tenant brand override variables.
- [ ] Industry override variables.
- [ ] Animation utility package.
- [ ] Class merge utility.
- [ ] Variant utility.

Required packages:

```text
tailwindcss
@tailwindcss/vite
tw-animate-css
tailwind-merge
class-variance-authority
clsx
```

Tailwind config must scan:

```text
apps/*/web/src
packages/ui/src
packages/framework/src
```

## Stage 3 - shadcn/ui foundation

Add shadcn/ui compatible setup.

- [ ] Add `components.json`.
- [ ] Map aliases to CODEXSUN folders.
- [ ] Keep generated primitives inside `packages/ui/src/primitives`.
- [ ] Keep composed components inside proper UI folders.
- [ ] Keep token styles in shared CSS.
- [ ] Do not put business components in shadcn folders.
- [ ] Document how to add a new primitive.
- [ ] Document how to update a primitive safely.

Required package:

```text
shadcn
```

Required aliases:

```text
@ui
@ui/primitives
@ui/forms
@ui/layout
@ui/data-display
@ui/feedback
@ui/overlays
@contracts
@framework
```

## Stage 4 - UI primitive package set

Install the approved UI primitive packages.

Required packages:

```text
radix-ui
@base-ui/react
lucide-react
@tabler/icons-react
cmdk
vaul
embla-carousel-react
input-otp
react-day-picker
next-themes
sonner
framer-motion
react-resizable-panels
```

Rules:

- [ ] Use one shared wrapper per primitive.
- [ ] Do not expose raw third-party component usage directly inside apps.
- [ ] Do not mix visual styles inside apps.
- [ ] Icons must be wrapped or exported through `packages/ui`.
- [ ] Theme switching must use the shared theme provider.
- [ ] Toasts must use the shared feedback provider.

## Stage 5 - Server state and API state

Add TanStack Query as the only default frontend server-state layer.

Required package:

```text
@tanstack/react-query
```

Create:

- [ ] Query client factory.
- [ ] Query provider.
- [ ] Default stale time rule.
- [ ] Retry rule.
- [ ] Mutation error normalization.
- [ ] Request id propagation.
- [ ] Tenant header propagation.
- [ ] Industry header propagation.
- [ ] Auth token injection point.
- [ ] Cache invalidation naming rule.

Do not call backend APIs directly from components.

Components must use feature hooks or app service hooks.

## Stage 6 - Data table foundation

Add TanStack Table as the only default table engine.

Required package:

```text
@tanstack/react-table
```

Create shared table foundation:

- [ ] Table shell.
- [ ] Column definition helper.
- [ ] Sort state helper.
- [ ] Filter state helper.
- [ ] Pagination state helper.
- [ ] Row selection helper.
- [ ] Column visibility helper.
- [ ] Empty state.
- [ ] Loading state.
- [ ] Error state.
- [ ] Export action slot.
- [ ] Row action slot.

Do not create business columns in this task.

## Stage 7 - Forms and validation

Add form foundation packages.

Required packages:

```text
react-hook-form
@hookform/resolvers
zod
```

Create:

- [ ] Form provider wrapper.
- [ ] Field wrapper.
- [ ] Field error display.
- [ ] Required indicator.
- [ ] Dirty state helper.
- [ ] Submit loading helper.
- [ ] Zod resolver pattern.

Do not create business validation schemas in this task.

## Stage 8 - Rich interaction packages

Add packages needed by future shared UI patterns.

Required packages:

```text
@dnd-kit/core
@dnd-kit/modifiers
@dnd-kit/sortable
@dnd-kit/utilities
@tiptap/react
@tiptap/starter-kit
@tiptap/extension-link
@tiptap/extension-placeholder
@tiptap/extension-underline
recharts
date-fns
qrcode-generator
@fontsource-variable/inter
```

Rules:

- [ ] Drag and drop must be wrapped in shared UI helpers.
- [ ] Rich text editor must be wrapped before app usage.
- [ ] Charts must be wrapped before app usage.
- [ ] QR code generation must be behind a utility wrapper.
- [ ] Date formatting must use one shared date helper.
- [ ] Font import must be centralized.

## Stage 9 - Frontend test stack

Add frontend testing packages and scripts.

Required packages:

```text
vitest
@testing-library/react
@testing-library/user-event
@testing-library/jest-dom
jsdom
@playwright/test
```

Required checks:

- [ ] Unit test for one UI primitive.
- [ ] Unit test for theme provider.
- [ ] Unit test for query provider.
- [ ] Unit test for table shell.
- [ ] E2E smoke test for Platform web load.
- [ ] E2E smoke test for navigation shell.
- [ ] E2E smoke test for global error fallback.

## Stage 10 - Lint and quality stack

Add frontend quality packages.

Required packages:

```text
eslint
@eslint/js
typescript-eslint
eslint-plugin-react-hooks
eslint-plugin-react-refresh
globals
prettier
```

Rules:

- [ ] Type errors fail builds.
- [ ] Lint errors fail builds.
- [ ] Test failures fail builds.
- [ ] Unused exports are not allowed in shared UI.
- [ ] Any UI file nearing 600 lines must be split.
- [ ] No file may exceed 700 lines.

## Stage 11 - Package documentation

Update documentation:

- [ ] `packages/ui/ui.md`.
- [ ] `apps/platform/web/README.md`.
- [ ] `assist/documentation/changelog.md`.
- [ ] `assist/documentation/prompt-log.md`.

Document:

- [ ] Installed package groups.
- [ ] Why each package group exists.
- [ ] How to add a new shadcn primitive.
- [ ] How to add a new shared UI wrapper.
- [ ] How to add a new app web shell.
- [ ] How to test frontend packages.

## Stage 12 - Verification

Run:

- [ ] `npm install`
- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] `npm run build:platform:web`
- [ ] `npm run test:e2e`
- [ ] `npm run check`

Also verify:

- [ ] No duplicate React versions.
- [ ] No duplicate UI primitive wrappers.
- [ ] No app imports raw third-party UI packages directly.
- [ ] No business UI added.
- [ ] No file over 700 lines.
- [ ] No package is installed without documented ownership.

## Stop conditions

Stop if:

- package versions conflict with React or Vite
- Tailwind setup requires app-specific CSS
- shadcn generation places files outside `packages/ui`
- an app imports raw third-party UI primitives directly
- business UI is requested during this task
- dependency choice affects deployment boundary
- test setup cannot run in CI

## Completion response

Report:

- frontend runtime stack added
- Tailwind setup completed
- shadcn setup completed
- TanStack Query setup completed
- TanStack Table setup completed
- UI package groups installed
- test stack added
- documentation updated
- verification commands run
- skipped checks with reason
- next recommended task
