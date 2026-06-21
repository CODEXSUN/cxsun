# Tasks

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
