# TASK 5 - Central Frontend UI And Design System

Execute this task after Task 4 is complete.

Do not create business forms, business tables, or business workflows in this task.

## Objective

Create the central frontend UI foundation and design system that all CODEXSUN apps must follow.

The goal is to make future apps visually consistent, structurally consistent, accessible, and easy to maintain without copying UI code between apps.

## Ownership

Shared UI foundation belongs in:

```text
packages/ui/
```

Platform web usage belongs in:

```text
apps/platform/web/
```

Future apps must consume `packages/ui` primitives and must not copy private UI code from another app.

## Required package structure

```text
packages/ui/
|-- src/
|   |-- tokens/
|   |-- theme/
|   |-- primitives/
|   |-- layout/
|   |-- forms/
|   |-- data-display/
|   |-- feedback/
|   |-- navigation/
|   |-- overlays/
|   |-- icons/
|   |-- hooks/
|   |-- accessibility/
|   `-- index.ts
|-- tests/
|   |-- unit/
|   `-- visual/
|-- ui.md
|-- package.json
`-- tsconfig.json
```

## Stage 1 - Design tokens

- [ ] Define color tokens.
- [ ] Define typography tokens.
- [ ] Define spacing tokens.
- [ ] Define radius tokens.
- [ ] Define shadow tokens.
- [ ] Define z-index tokens.
- [ ] Define transition tokens.
- [ ] Define density tokens.
- [ ] Export tokens from `packages/ui`.
- [ ] Document tokens in `packages/ui/ui.md`.

## Stage 2 - Theme system

- [ ] Add light theme.
- [ ] Add dark theme.
- [ ] Add tenant/app brand override contract.
- [ ] Add industry theme override contract.
- [ ] Add CSS variable strategy.
- [ ] Add theme provider.
- [ ] Add theme persistence rule.
- [ ] Add theme tests.

## Stage 3 - Layout system

- [ ] Add app shell layout.
- [ ] Add sidebar layout.
- [ ] Add topbar layout.
- [ ] Add page header layout.
- [ ] Add content container layout.
- [ ] Add split panel layout.
- [ ] Add responsive grid layout.
- [ ] Add mobile navigation pattern.
- [ ] Add layout documentation.

## Stage 4 - UI primitives

Create shared primitives only.

- [ ] Button.
- [ ] Input.
- [ ] Textarea.
- [ ] Select.
- [ ] Checkbox.
- [ ] Radio.
- [ ] Switch.
- [ ] Badge.
- [ ] Avatar.
- [ ] Tooltip.
- [ ] Separator.
- [ ] Card.
- [ ] Tabs.
- [ ] Accordion.

Rules:

- [ ] Primitives must not contain business logic.
- [ ] Primitives must be accessible.
- [ ] Primitives must support theme tokens.
- [ ] Primitives must support disabled/loading/error states where relevant.

## Stage 5 - Forms foundation

Create reusable form foundation without business fields.

- [ ] Form wrapper.
- [ ] Form section.
- [ ] Field label.
- [ ] Field description.
- [ ] Field error.
- [ ] Required marker.
- [ ] Form grid.
- [ ] Inline field row.
- [ ] Form actions.
- [ ] Validation display pattern.
- [ ] Dirty state pattern.
- [ ] Submit loading pattern.

Do not create Contact, Billing, Product, Accounting, Ecommerce, CRM, or other business forms.

## Stage 6 - Data display foundation

Create reusable display components.

- [ ] Table shell.
- [ ] Table toolbar.
- [ ] Column header.
- [ ] Sort indicator.
- [ ] Filter slot.
- [ ] Pagination.
- [ ] Row action menu.
- [ ] Empty table state.
- [ ] Loading table state.
- [ ] Error table state.
- [ ] Detail card.
- [ ] Stat card.
- [ ] Timeline.

Do not create business tables or app-specific lists.

## Stage 7 - Feedback foundation

- [ ] Toast.
- [ ] Alert.
- [ ] Inline error.
- [ ] Page error.
- [ ] Empty state.
- [ ] Loading state.
- [ ] Skeleton.
- [ ] Progress indicator.
- [ ] Confirmation prompt.
- [ ] Global loader standard.

## Stage 8 - Overlays and dialogs

- [ ] Modal dialog.
- [ ] Drawer.
- [ ] Popover.
- [ ] Dropdown menu.
- [ ] Command menu.
- [ ] Confirm dialog.
- [ ] Sheet layout.
- [ ] Focus trap.
- [ ] Escape key behavior.

## Stage 9 - Navigation foundation

- [ ] Main nav item contract.
- [ ] Sidebar section contract.
- [ ] Breadcrumb.
- [ ] Page tabs.
- [ ] User menu.
- [ ] App switcher placeholder.
- [ ] Tenant/industry context display placeholder.

Do not implement app-specific navigation entries beyond Platform shell placeholders.

## Stage 10 - Frontend API client pattern

Define frontend API usage standard.

- [ ] Base API client.
- [ ] Request id propagation.
- [ ] Auth header injection.
- [ ] Tenant context header rule.
- [ ] Industry context header rule.
- [ ] Error normalization.
- [ ] Retry rule.
- [ ] Abort/cancel rule.
- [ ] Query/cache pattern.
- [ ] Contract type usage from `packages/contracts`.

## Stage 11 - Route guard pattern

- [ ] Auth guard.
- [ ] Permission guard.
- [ ] Tenant guard.
- [ ] Industry guard.
- [ ] App enablement guard.
- [ ] Loading fallback.
- [ ] Unauthorized fallback.
- [ ] Not found fallback.

## Stage 12 - Accessibility baseline

- [ ] Keyboard navigation rule.
- [ ] Focus visible rule.
- [ ] ARIA rule.
- [ ] Color contrast rule.
- [ ] Reduced motion rule.
- [ ] Form error announcement rule.
- [ ] Dialog focus rule.
- [ ] Table accessibility rule.

## Stage 13 - UI documentation and preview

- [ ] Add `packages/ui/ui.md`.
- [ ] Add component usage examples.
- [ ] Add token documentation.
- [ ] Add theme documentation.
- [ ] Add layout documentation.
- [ ] Add form pattern documentation.
- [ ] Add table pattern documentation.
- [ ] Add accessibility notes.
- [ ] Add UI preview tool or documented preview route.

## Stage 14 - Platform web integration

Integrate only foundation UI into Platform web.

- [ ] Platform app shell uses `packages/ui`.
- [ ] Platform login shell uses form foundation.
- [ ] Platform dashboard shell uses layout foundation.
- [ ] Platform status page uses feedback/data display foundation.
- [ ] Platform route guards use route guard pattern.
- [ ] No business forms added.

## Stage 15 - Verification

Run:

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] UI package tests.
- [ ] Platform web build.
- [ ] Accessibility checks where available.
- [ ] `npm run check`

## Stop conditions

Stop if implementation requires:

- business form fields
- business table columns
- app-specific workflows
- copying UI from one app into another
- UI primitive importing app code
- business logic inside `packages/ui`
- file over 700 lines

## Completion response

Report:

- UI package structure created
- design tokens created
- theme system created
- primitives created
- layout system created
- form foundation created
- data display foundation created
- feedback foundation created
- route/API patterns created
- Platform web integration completed
- verification commands run
- unresolved decisions
- whether business app planning can start
