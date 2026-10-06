# CODEXSUN Project Inventory

> Database boundary update: the Platform master database contains unprefixed global Platform/Super Admin tables. Tenant Platform runtime tables use `app_`; composed apps keep their owner prefixes. Every database records migrations in `migration_schema`. Platform Task Manager stores todos and lookups in the Platform master or enabled tenant database. Project Manager owns Platform Registry data and audit activity under the `project_manager_` table prefix.

## Purpose

This document records what is present in the current CODEXSUN workspace. Use it as the first practical inventory before
planning new work, because some assist files describe future direction or older foundation snapshots.

Last reviewed: 2026-08-16.

## Working Repository

The current and authoritative checkout is:

```text
D:\workspace\cxsun
```

Its Git remote is `https://github.com/CODEXSUN/cxsun.git`. Older CODEXSUN/CXSUN
workspace paths are not project sources and must not be used for implementation,
configuration, documentation, or verification.

## Current Workspace Shape

```text
apps/
  platform/
    api/
    web/
    windows/
  core/
    api/
    web/
  billing/
    api/
    web/
  mail/
    api/
    web/

devkits/
  project-manager/
    api/
    web/
  uiux/

packages/
  framework/
  ui/

tools/
  version/
  *.mjs

assist/
  agents/
  architecture/
  blueprint/
  devops/
  documentation/
  execution/
  governance/
  handoff/
  industries/
  operations/
  product/
```

The root package uses npm workspaces with `apps/*/*`, `devkits/*`, `devkits/*/*`, `packages/*`, and `tools/*`.

## Runtime Application And Composed Packages

### Platform

Platform owns the SaaS foundation.

- `apps/platform/api`: Fastify API for tenant identity, auth, app registry, database setup, tenant provisioning, and
  platform operations.
- `apps/platform/web`: React/Vite shell for the domain-resolved tenant app portal, login, super-admin desk, admin
  desk, tenant desk, and tenant UI. It embeds the UIUX gallery and retains the existing component catalog.
- `apps/platform/windows`: Tauri 2/Rust host that opens the shared Platform React UI through WebView2 and stores
  only a validated, non-secret one-workspace projection in device-local SQLite.

Platform is the production runtime: API `7010` and Web `7020`.

Current Platform API modules:

- `app-registry`
- `task-manager` (MariaDB-backed; private visibility by default)
- `tenant`

Current Platform Web modules:

- `design-system`
- `task-manager`
- `tenant`
- `tenant-portal` (read-only public projection owned by `platform.tenant`)

### UIUX

- `devkits/uiux`: standalone Vite gallery and Super Admin desk contribution for shared UI foundations, layouts,
  workspace blocks, and components. It imports public `@cxsun/ui` contracts and owns no application data.

### Project Manager

Project Manager owns Platform Registry and Ideas and is composed by Platform through its public API and web contracts.

- `devkits/project-manager/api`: request-scoped Platform Registry and Ideas Fastify modules, migrations, registry JSON seed,
  and activity records.
- `devkits/project-manager/web`: the Platform Registry and Ideas workspaces used by the Super Admin desk.
- Ideas use `project_manager_ideas` and `project_manager_ideas_activity` in the Project Manager migration scope.
  Rich content is sanitized before persistence; create, update, and archive write activity in the same transaction.
- The migration preserves applied DevKit checksums, then renames existing registry tables in place to the
  `project_manager_` prefix in master and tenant databases. Migration state remains in `migration_schema`.
- Platform supplies the authenticated request database and actor. Project Manager does not resolve tenant identity from
  browser input and uses the existing HttpOnly CXSUN session cookie.

### Auditor

- `apps/auditor/api` owns the client directory, portal credential migration, permission seed, and `/auditor/clients` routes. The Platform API composes it using the existing desk user session.
- `apps/auditor/web` owns the client list, create/edit form, linkable detail page, and four portal credential rows. The Auditor desk mounts it through an injected API gateway and shows Clients in its side menu.
- Client records contain a client name, optional company name, owner name, mobile, email, GSTIN, and status. They are not Platform tenants or portal users.
- Auditor clients use the dedicated `auditor_clients` table when Auditor is enabled. They are distinct from Platform tenants and do not have their own login accounts.
- `auditor_client_credentials` stores one encrypted password and username or email per client and portal: GSTIN, E-Way Bill, E-Invoice, and Accounts. Passwords are fetched only through a separate permission-checked, uncached reveal endpoint for copying. The encryption key derives from the Platform `JWT_SECRET`, which must be retained to read existing credentials.

### Core

Core owns shared business foundation modules consumed by Platform.

- `apps/core/api`: Fastify plugin package registered by Platform API.
- `apps/core/web`: React module package bundled by Platform Web.

Current Core common modules include location masters, contacts, products, work orders, organisation setup, and the
accounts masters `ledger-groups` and `ledgers`. Each accounts master owns its API migration, repository, service,
routes, seed, and frontend workspace; ledgers reference ledger groups within the tenant database.

### Billing

Billing owns billing-related business modules.

- `apps/billing/api`: Fastify plugin package registered by Platform API.
- `apps/billing/web`: React module package bundled by Platform Web.

Current Billing module:

- `sales`

### Accounts

Accounts owns tenant-scoped operational accounting and is composed by Platform through its public API and web contracts.

- `apps/accounts/api`: chart of accounts, periods, manual journals, Cash Book, Bank Book, centralized posting, ledger reads, tenant migrations, and deterministic seeds.
- `apps/accounts/web`: Accounts overview, Journal, Ledger, Accounting Periods, Cash Book, and Bank Book workspaces bundled by Platform Web.
- Manual journals remain independent in `acc_journal_entries` and `acc_journal_lines`.
- Cash and Bank source documents are independently persisted in `acc_cash_entries` and `acc_bank_entries`.
- Finalized postings are immutable centralized records in `acc_entries` and `acc_entry_lines`; source records link to their posted entry, and reversal creates an opposing centralized entry.
- The legacy `acc_ledger` table remains migration-compatible, but current posting and ledger reads use the centralized entry tables.

### Mail

Mail owns tenant-scoped outbound delivery, inbound synchronization, message history, attachments, and provider configuration.

- `apps/mail/api`: Fastify module package with tenant migrations, encrypted settings, SMTP delivery, IMAP/POP3 synchronization, queue workers, retries, events, and public contracts.
- `apps/mail/web`: React workspace for Inbox, Outbox, Drafts, Scheduled, Sent, Failed, Trash, rich compose, attachments, and tenant settings.

Billing document screens consume Mail only through its public web contract to capture the visible invoice or quotation as a PDF and enqueue a branded customer email.

Product development and release tooling preserves those ownership boundaries while deploying one composed runtime.
`npm run stack:impact -- <changed files>` identifies the verification blast radius, while
`npm run stack:plan -- <stack>` prints the composed Platform services, owned migration scopes, and rollback plan.

The `.env` contract contains network configuration only: API/web hosts or origins and ports. Product
names, purpose text, taglines, and other business identity must not be added to `.env`.

## Shared Packages

### `@cxsun/framework`

Shared backend runtime package. It exports API bootstrap helpers, config/env loading, database contracts, errors,
events, health, HTTP envelope utilities, logging, module contracts, queues, storage contracts, and testing helpers.

### `@cxsun/ui`

Shared frontend UI package. It exports components, layouts, menu blocks, design-system tokens, workspace controls,
workspace presets, forms, tables, filters, panels, date picker, autocomplete, drag/drop helpers, print helpers, and
shared styling.

## Tooling

Important root commands:

```text
npm run dev
npm run desktop:build
npm run desktop:run
npm run desktop:publish
npm run desktop:package
npm run desktop:install
npm run desktop:uninstall
npm run build
npm run typecheck
npm run lint
npm run check
npm run verify:platform
npm run check:module-boundaries
npm run dependencies:check
npm run db:migrate
npm run db:seed
npm run db:drop
npm run dbmigrate:fresh
npm run test:e2e:composed-runtime
npm run test:e2e:bootstrap
npm run test:e2e:persistence
npm run test:e2e:organisation
npm run version:show
npm run version:bump
npm run changelog:append
npm run check:versions
```

Shared development dependencies and operational commands are declared only in
the root `package.json`. Workspace manifests retain their package identity,
build/typecheck/lint scripts, and direct runtime dependencies. Only the root
manifest exposes `npm run dev`.

Database commands currently route through `@cxsun/platform-api` and `apps/platform/api/src/database/db-cli.ts`.

## Current Version And Work Update

Current recorded version: `1.0.62`.

Latest changelog entry: `v-1.0.62` on 2026-08-16.

Latest recorded work:

- Replaced the WinUI 3/.NET host with Tauri 2, Rust, React, WebView2, and SQLite.
- Replaced MSIX/App Installer packaging with current-user NSIS and signed Tauri updates through GitHub Releases.
- Preserved the existing desktop SQLite path during WinUI-to-Tauri installation.
- Kept the desktop release scoped to verified cloud enrollment; module-owned offline Billing remains open.
- Workspace version is `1.0.62`.

Current working tree note:

- The working tree was clean before this documentation update.
- Always inspect `git status` before editing and preserve unrelated user changes.

## Documentation Notes

Use these files first for active work:

- `assist/README.md`: high-level product and agent entry point.
- `assist/documentation/CHANGELOG.md`: latest recorded version state and change history.
- `assist/documentation/project-inventory.md`: current repo inventory.
- `assist/documentation/app-bundle-structure.md`: target app/module ownership rules.
- `assist/documentation/design-system-helper.md`: UI and module screen standards.
- `assist/governance/rules.md`: general development rules.
- `assist/governance/engineering-standards.md`: engineering practices.
- `assist/governance/testing-strategy.md`: verification expectations.
- `assist/governance/quality-gates.md`: finish-line checks.

Some execution and handoff files preserve earlier foundation history or future direction. Validate their code paths
against this inventory before treating them as current implementation state.
