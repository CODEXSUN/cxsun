# Tasks

## 2026-06-24 - CXSync all-tenant fleet upgrade preparation

**Batch:** #128

- [x] Correct CXSync scope to database maintenance, audit, clone, migration rehearsal, and controlled upgrades only.
- [x] Record the corrected boundary in durable memory and canonical assist context.
- [x] Add protected active-MariaDB tenant fleet inventory.
- [x] Add idempotent release-batch persistence with deterministic candidate databases.
- [x] Enforce canary-first, serial, stop-on-failure fleet preparation.
- [x] Add a disabled-by-default server-side clone execution gate.
- [x] Add consistent full-data logical dump and candidate restore preparation.
- [x] Verify exact source/candidate row parity before migration.
- [x] Run reviewed tenant migrations against the candidate database only.
- [x] Verify retained existing-table row counts after migration.
- [x] Keep production cutover and source/candidate deletion entirely outside automatic preparation.
- [x] Add the CXSync Cloud Fleet Upgrades operator page.
- [x] Add contract and live integration coverage for fleet inventory and batch preparation.
- [x] Add an isolated CXSync maintenance container, image, workspace volume, and host ports.
- [x] Ensure maintenance startup bypasses normal database setup, shared platform migrations/seeds, tenant provisioning, Redis, and the main application runtime.
- [x] Add a fail-closed expected-release check and initial-deploy clone lock.
- [x] Add an isolated deployment/stop script and split Nginx web/API proxy configuration.
- [x] Add matching Desktop and Cloud Full SQL Dump pages with database credential entry and table inventory.
- [x] Require every table checkbox before backup so every run remains a complete database dump.
- [x] Add Desktop native folder selection and Cloud storage-restricted folder selection.
- [x] Run dumps in the background with byte progress, completion/failure state, and final location.
- [x] Publish completed SQL files atomically and keep credentials out of command arguments and persistent application storage.
- [x] Replace the single-database form with a server-connected database list excluding MariaDB system schemas.
- [x] Add a database show page with table, row-estimate, and size details.
- [x] Add database selection and serial bulk dump queues with per-item progress and results.
- [x] Add a read-only Desktop-to-Cloud diagnostic sequence for API, release, MariaDB, tenant DB, storage, tool, and safety checks.
- [x] Add redacted deployment/reinstall recommendations without running database mutation paths.
- [x] Split CXSync into isolated Maintenance Upgrade and Mirror modes in documentation and navigation.
- [x] Add Maintenance Upgrade as a dedicated app page that keeps full clone/upgrade/verify/cutover-later work separate from daily sync.
- [x] Add Mirror as a dedicated app page with protected Cloud foundation status while keeping the scheduler unarmed.
- [x] Add separate Desktop and Cloud mirror operational tables for mirror jobs and cursors.
- [x] Add manual Mirror Full Sync: Cloud creates a full tenant dump, Desktop downloads it, restores into a dedicated local mirror database, verifies table/row counts, and records a full-dump cursor.
- [x] Harden Mirror Full Sync with `cxmirror_` target enforcement, per-table row verification, persisted Desktop history, persisted Cloud evidence/expiry metadata, and recent job history in the Mirror page.
- [x] Add all-tenant Mirror full-sync queue that runs saved tenant connections serially and reports completed/failed counts.
- [x] Add local daily Mirror schedule for the office server; it runs all tenants only while CXSync Desktop is open and skips runs when another queue is active.
- [x] Add manual Mirror incremental pull for eligible tables with a single primary key and `updated_at`, upsert changed rows into `cxmirror_*`, and persist per-table `updated-at-json` cursors.
- [x] Add all-tenant Mirror incremental queue and schedule mode selection for daily full bootstrap or daily incremental pull.
- [x] Harden incremental Mirror with required full-dump bootstrap cursor, source database cursor persistence, recent incremental history, and summary evidence.
- [x] Add and run repeatable Mirror E2E smoke for protected full dump, disposable local restore, per-table row verification, incremental upsert check, and cleanup.
- [x] Complete Mirror flow with table coverage reporting, skipped-table reasons, paged incremental catch-up, page safety cap, and Desktop audit JSON export support.
- [x] Close the current Mirror release baseline as complete for safe online-to-offline office replication.
- [x] Split CXSync into breadcrumb-switchable Sync and Mirror desks with separate side menus.
- [x] Rework CXSync Mirror into clean tenant list and tenant show pages with focused forms and visual cards.
- [x] Rework Mirror schedule into a clean upsert card with enable/disable switch.
- [x] Move Mirror schedule upsert to a separate Mirror Settings page.
- [x] Add Mirror Sync top controls for full sync, start, pause, stop, and refresh.
- [x] Add tenant progress cards with status details and progress bars, removing remaining/queued wording from the queue display.
- [x] Convert Mirror Sync tenant display to a Super Admin-style one-row table and remove count cards.
- [x] Add compact colored runtime/schedule indicators and icon-led short status pills.
- [ ] Run the first approved VPS canary clone with `CXSYNC_FLEET_CLONE_ENABLED=true`.
- [ ] Review canary evidence before preparing the remaining live tenants.
- [ ] Design and approve the separate production cutover/rollback operation after all candidates validate.
- [x] Add safe delete propagation through explicit tenant `cxsync_mirror_tombstones` outbox and report `missing-tombstone-outbox` when the source has not enabled it.

## 2026-06-24 - CXSync Cloud audit ownership and verification

**Batch:** #127

- [x] Trace the Desktop, tenant-backend, and CXSync Cloud report paths.
- [x] Keep the tenant billing backend CXSync API snapshot-only.
- [x] Move sync-audit report ingestion to CXSync Cloud.
- [x] Resolve report identity against the master tenant registry.
- [x] Make repeated `(tenant, jobId)` uploads return the original report.
- [x] Add Cloud report listing for verification and administration.
- [x] Add a focused contract test.
- [x] Add a live service-key-protected integration smoke harness.
- [x] Update CXSync and execution documentation.
- [x] Run the integration smoke against a running CXSync Cloud and the Aaran Associates master tenant.
- [x] Complete the full Desktop schema drift, backup, repair, and audit-upload drill against an isolated schema clone.
- [x] Restore the tenant connection to `codexsun_db` and remove the temporary drill database.
- [x] Build the CXSync 1.0.127 Windows installer and smoke-test the unpacked application.
- [ ] Install and validate the CXSync Windows package on a separate clean workstation.

## 2026-06-21 - CXSync schema baseline decorator runtime

- [x] Trace the codebase baseline scratch-schema launcher.
- [x] Pass the server decorator-enabled `tsconfig.json` explicitly to TSX.
- [x] Verify CXSync typecheck and Electron compilation.
- [x] Verify the scratch builder reaches environment validation without decorator transform errors.

## 2026-06-21 - Tirupur Connect company moderation

- [x] Add protected admin company detail API.
- [x] Add company moderation list with search, status/source filters, and refresh.
- [x] Add a complete company inspection view for profile, provenance, categories, products, and verification evidence.
- [x] Add explicit reviewed publication decisions with optional notes.
- [x] Lazy-load the company workflow from the B2B admin shell.
- [x] Verify server and B2B admin typechecks/builds.

## 2026-06-21 - Tirupur Connect RFQ moderation

- [x] Add protected admin RFQ detail API.
- [x] Add RFQ moderation list with search, status/privacy filters, and refresh.
- [x] Add full requirement review with buyer context, attachments, supplier quotations, and lead activity.
- [x] Add audited RFQ lifecycle decisions with optional review notes.
- [x] Lazy-load the RFQ workflow from the B2B admin shell.
- [x] Verify server and B2B admin typechecks/builds plus marketplace contract tests.

## 2026-06-18 - Electron desktop application

- [x] Audit the reserved desktop workspace.
- [x] Implement the secure Electron main and preload processes.
- [x] Package and serve frontend assets locally for no-internet UI startup.
- [x] Add configurable desktop API discovery.
- [x] Add root development/build commands and Electron Builder configuration.
- [x] Verify desktop/frontend typechecks and an unpacked Windows launch.
- [x] Build the distributable Windows installer.
- [x] Switch the desktop default API base to `http://codexsun.local:6005`.
- [x] Add a desktop E2E smoke script that verifies the runtime API base.
- [x] Open the packaged desktop UI with `codexsun.local` instead of `127.0.0.1`.
- [x] Replace the default Electron frame/installer icon with a CXSun desktop icon.
- [x] Add Super Admin login to the user nav and open it in a separate app window.
- [x] Add first-run desktop host diagnostics for missing `codexsun.local` hosts mapping.
- [x] Add a frontend desktop connection panel for API health and tenant-domain lookup failures.

## 2026-06-18 - TConnect / Tirupur Connect boundary

- [x] Read the corrected boundary supplied by the user.
- [x] Audit the existing TConnect server module and Tirupur Connect app.
- [x] Add the boundary to the architecture rulebook.
- [x] Add canonical AI context documentation.
- [x] Mark conflicting legacy execution guidance as superseded.
- [x] Update developer-facing TConnect documentation.
- [x] Prepare the implementation and data-migration plan.
- [x] Implement central marketplace tables and defaults.
- [x] Implement marketplace authentication and guards.
- [x] Implement public, member, admin, and sync APIs.
- [x] Implement immutable submission/revision review.
- [x] Verify backend typecheck, build, and contract tests.
- [ ] Migrate legacy tenant 115 marketplace data after count/reconciliation tooling is prepared.
- [ ] Change the existing TConnect connector publish command to use signed sync.

## Versatile Agent OS Documentation

- [x] Inspect repository structure and current app boundaries.
- [x] Read ZRO templates and assist architecture/product context.
- [x] Replace ZRO overview and guide with CXSun / Versatile OS direction.
- [x] Replace ZRO core vision and architecture with concrete Agent OS plan.
- [x] Add `ZRO/Vision/agent-os.md`.
- [x] Add Agent OS roadmap, phase map, shipped inventory, and checklist.
- [x] Add ZRO session log.
- [x] Add `assist/context/versatile-agent-os.md`.
- [x] Update assist README, product picture, and architecture context.

## Next Slice

- [x] Implement P1 Helper Agent backend module base.
- [x] Add `conversations`, `agent_logs`, and `knowledge_documents`.
- [x] Add mini Agent icon and tenant dashboard app entry.
- [x] Add Agent OS base frontend page.
- [x] Rename visible product surface to ZETRO.
- [x] Add switchable model config and selector.
- [x] Add universal ZETRO chat window shell.
- [x] Add base chat endpoint with conversation/log writes.
- [x] Add OpenRouter-compatible model client.
- [x] Configure free models first and premium models through env/API keys.
- [x] Connect ZETRO to the dedicated role-filtered `ZRO/ZETRO/docs` system.
- [x] Add ZETRO read-only public screen at `/zetro`.
- [x] Add adaptive markdown search and learn/index function.
- [x] Add API connection status and one-time OpenRouter key test endpoint.
- [x] Add ZETRO dashboard API panel and chat shortcut.
- [x] Add recommended updates to ZETRO surfaces.
- [x] Add encrypted provider key persistence for OpenRouter, OpenAI, Gemini, OpenCode Zen, and custom OpenAI-compatible providers.
- [x] Make ZETRO chat use the active saved provider connection.
- [x] Change provider tests to perform real chat/generateContent checks.
- [x] Refresh OpenRouter free model choices from the live model catalog and avoid stale discontinued `:free` slugs.
- [x] Make ZETRO dashboard status cards and multi-agent stack dynamic from backend status.
- [x] Polish ZETRO reply behavior and chat rendering for compact markdown answers.
- [x] Make the dashboard switchable model card interactive and persist default model changes.
- [x] Constrain ZETRO model dropdown height so it scrolls internally.
- [x] Add chat fallback when a selected free model is rate-limited or temporarily unavailable.
- [x] Add AI platform manager UI for OpenRouter, OpenAI/GPT, Gemini, OpenCode Zen, and custom providers.
- [x] Add optional env fallback keys for OpenAI/GPT, Gemini, OpenCode Zen, and custom providers.
- [x] Add ZETRO chat history memory with full-window history view, dated saved chats, load previous chat, new chat from history, clear current, and clear all.
- [x] Polish ZETRO chat box with adaptive glass UI, signature hero, rotating empty-state prompt, bottom model picker, and auto-scroll to newest messages.
- [x] Split ZETRO behavior into restricted user/super-admin audiences with hidden model/provider details for all non-super-admin roles and super-admin-only recommended updates.
- [x] Add legal/compliance/secret restriction behavior and dedicated policy docs.
- [x] Restrict ZETRO runtime search to the dedicated `ZRO/ZETRO` docs boundary.
- [x] Add tenant-aware read-only sales and purchase summary query tools.
- [x] Add super-admin query-insights review for repeated client questions and mapped intents.
- [x] Split the super-admin ZETRO base screen into focused pages for Base, Providers, Knowledge, Agents, Queries, and Updates.
- [x] Fix ZETRO fetch/learn flow errors by restoring backend startup, bounding tenant provisioning, and surfacing failed Learn/API payloads.
- [x] Expand approved read-only tenant query tools for customer balances, supplier balances, sales bill details, and purchase bill details.
- [x] Add a database-backed ZETRO Query Registry for approved tools, aliases, mappings, and business-query usage logs.
- [x] Add super-admin mapping candidates from recent ZETRO chat logs.
- [ ] Verify with platform FAQ prompts after docs are indexed.
- [x] Verify a live provider response through the saved OpenRouter connection.

## 2026-06-18 - Sales manual invoice override numbering

- [x] Trace Sales invoice resolution and document-number reconciliation.
- [x] Stop manual Sales overrides from advancing the automatic sequence.
- [x] Reject duplicate manual Sales invoice numbers without consuming a new number.
- [x] Preserve numbering gaps by reconciling only consecutive used numbers.
- [x] Update Sales and Document Settings documentation.
- [x] Verify focused Sales numbering assertions, diff checks, and docs build.
- [ ] Re-run server typecheck/build after the unrelated Tirupur Connect compile errors are resolved.

## 2026-06-18 - Manual override numbering across entries

- [x] Apply exact manual override behavior to Purchase, Export Sales, Receipt, and Payment.
- [x] Apply exact manual override behavior to Journal, Contra, Cash Book, and Bank Book.
- [x] Add duplicate protection and collision-safe automatic numbering to Purchase Receipt and Delivery Note.
- [x] Remove sequence advancement from manual document overrides.
- [x] Verify server typecheck/build, focused numbering checks, and documentation build.

## 2026-06-18 - Inline product HSN mapping

- [x] Trace the shared Product Autocomplete create-and-select flow.
- [x] Preserve selected HSN, Unit, and GST records during inline product creation.
- [x] Map the created product directly into Sales, Purchase, and Quotation line drafts.
- [x] Refresh dependent lookup caches after product creation.
- [x] Verify frontend typecheck/build.

## 2026-06-18 - Secondary address create-and-populate

- [x] Trace Sales, Purchase, and Quotation secondary-address dialogs.
- [x] Return the persisted address instead of only a stale formatted string.
- [x] Resolve fresh country/state/district/city/pincode labels after save.
- [x] Immediately populate address and state/tax fields before contact refetch completes.
- [x] Verify frontend typecheck/build.

## 2026-06-18 - Entry workflow documentation

- [x] Capture original live screenshots for Sales, Purchase, Quotation, Receipt, Payment, Cash Book, and Bank Book.
- [x] Write separate clean step-by-step guides for all seven entry workflows.
- [x] Document preparation, entry order, allocation/address behavior, verification, and common mistakes.
- [x] Update the Docusaurus Entries sidebar.
- [x] Verify docs typecheck/build and rendered pages.

## 2026-06-19 - Sales e-invoice GST 400 handling

- [x] Trace Sales IRN generation through the GST compliance client and backend settings gate.
- [x] Show the backend GST error message instead of the generic HTTP 400 toast.
- [x] Retry Sales GST operations against the alternate environment only when the active environment settings are not enabled.
- [x] Persist the working GST API environment after a successful fallback.
- [x] Verify frontend typecheck and production build.

## 2026-06-19 - Sales E-Way Bill print page

- [x] Inspect the referenced E-Way Bill PDF layout and text structure.
- [x] Add a dedicated Sales E-Way Bill print component with QR, Part A, Part B, and barcode sections.
- [x] Add GST compliance document lookup for saved E-Way validity fields.
- [x] Add Invoice/E-way print switch and download action on the Sales show page.
- [x] Verify existing Sales invoice print view still renders when no E-Way Bill exists.
- [x] Verify frontend typecheck and production build.
