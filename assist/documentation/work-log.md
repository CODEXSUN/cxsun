# Work Log

## 2026-06-25

- Completed the standalone Billing API boundary and frontend routing through `VITE_BILLING_API_BASE_URL`.
- Added `packages/platform` for shared backend runtime capabilities and removed Billing API dependencies on the legacy combined server.
- Removed proven duplicate Billing routes from `apps/server` while retaining tenant-provisioning migration bridges.
- Verified Billing API with local MariaDB-backed contract, e2e, module, and mutation suites plus frontend and container checks.
- Re-ran Platform API and Billing API E2E suites and verified live frontend traffic reaches the standalone services on ports `6105` and `6205`.
- Added the root `dev:billing-stack` command for concurrent Platform API, Billing API, and frontend development.
- Updated shared dev preflight to kill stale configured-port listeners and reuse the same ports during restart.
- Added an immediate frontend startup screen that is visible until React mounts.
- Fixed local frontend authentication and Billing requests from falling back to legacy port `6005` during extracted-stack development.
- Removed unnecessary legacy tenant-static and health requests from login/dashboard startup.
- Added a visible Platform/Billing readiness gate so frontend interaction follows backend health while preserving immediate first paint.
- Made concurrent Platform/Billing development logs compact and readable while preserving production JSON logging.
- Added standalone Sites API and routed public tenant pages/contact submissions to port `6405`.
- Routed dashboard company context and billing settings clients to standalone Billing API.
- Cleaned remaining extracted-stack frontend mappings so quotation master lookups, contact, media, mail, print-PDF, and site slider calls no longer fall back to legacy port `6005`.
- Set the shared shadcn radius token to medium for cleaner input/control corners.
- Added standalone CRM, Tally, Frappe, Task Manager, Auditor, Blog, and Agent OS API workspaces using `@cxsun/platform`, with root scripts, preflight ports, service docs, frontend base URLs, and no `apps/server` source dependency.
- Routed the requested frontend feature clients away from the generic server base and added `dev:extracted-stack` with configurable readiness checks.
- Moved GST compliance calls and module ownership to Billing API, and moved subscription, app setup, app runtime, and storage helper ownership to Platform API; System Update remains pending on the legacy server by decision.
- Rewired Ecommerce API to the shared platform runtime with no direct legacy server source dependency.
- Routed Ecommerce page source product/contact/category lookups through Ecommerce API.
- Added Ecommerce API to the extracted-stack dev command and readiness gate.
- Removed System Update from active server mounting and frontend navigation/rendering; database backup/restore remains available through Database Manager.
- Bumped the workspace to version `1.0.130`.

## 2026-06-09

- Added a repo-owned Python Nginx tenant CLI under `.container/cli` for repeated cloud domain setup.
- Wired the generated vhost shape to the CXSun cloud ports: backend/storage/API/health on `6005` and frontend on `6010`.
- Added dry-run, SSL/Certbot, force overwrite, alias, `--www`, and no-`www` default behavior for tenant domains and subdomains.
- Documented server usage in the CLI README and container Nginx docs.
- Bumped the workspace to version `1.0.91`.

## 2026-06-08

- Added Tally contact resync from the contact edit flow and from already-synced contact rows.
- Fixed Tally ledger mailing/GST XML so contact address, pincode, state, country, and GSTIN/UIN persist in TallyPrime.
- Reworked Tally product sync into inventory master sync with stock item group, unit, HSN, GST supply type, and GST rate details.
- Added default Tally unit/UQC bootstrap and expanded the common unit seed list to match Tally UQC choices.
- Bumped the workspace to version `1.0.88`.

## 2026-06-07

- Added the Tally integration desk with strict handshake validation against the selected Tally company.
- Added Tally Master Sync pages for contacts and products with filtered lists, status badges, selectable rows, and selected-only sync actions.
- Added reusable Tally sync status tracking for sales and purchase entry readiness checks.
- Added backend sync link persistence, direct Tally ledger/product master export, and queue-backed entry export preparation.
- Fixed Tally XML import and parser handling so contact ledgers sync successfully and store Tally master IDs.
- Verified server/frontend typechecks and live Tally contact sync against `Sundarcomputers`.

## 2026-06-06

- Added Export Sales as a separate tenant Billing entry module with independent tables, API, document numbering, list/show/upsert/print, GST actions, comments, activity, and exact-print PDF email delivery.
- Added Common Currency selection to Export Sales and persisted both the selected currency id and saved display name.
- Added Export Sales year/month totals to Billing Overview and the monthly financial-year summary table while keeping domestic Sales separate.
- Added the company-published `feature-export-sales` switch under Sales Settings -> Features and wired it across sidebar navigation, shortcuts, overview, routes, and document settings.
- Kept Billing Overview and billing entry lists scoped to the selected default company and accounting year.
- Hardened tenant mail attachment visibility and temporary exact-print PDF lifecycle.
- Documented the database-backed global GSP plus tenant GST credential split and the manual-by-default tenant-domain behavior.

## 2026-06-03

- Added the tenant-aware Mail app surface with Mail Desk navigation, compose, inbox, drafts, scheduled, sent, trash, contacts, and tenant mail settings.
- Added backend tenant mail tables, settings/default fallback support from environment variables, queued message storage, attachments, events, and SMTP dispatch through the mail queue lane.
- Verified live Hostinger SMTP settings and confirmed a queued tenant mail message could be sent through the dispatcher.
- Reworked Mail Settings controls with proper select sizing and a green active tenant-mail switch.
- Reworked the Mail Inbox into the existing Sales-style workspace flavour with top `Refresh` and `New` actions, search/filter/column toolbar, table row action dropdown, view dialog, trash action, and pagination.
- Removed the duplicate inner Mail sidebar so the outer Mail Desk side menu owns the full flow.

## 2026-05-23

- Added the Media application as a standalone tenant module with library, link, sharing, upload, delete, public/private storage, and queue-backed backend events.
- Added an application-wide media picker popup and connected Company logo upload/selection to the picker.
- Removed the duplicate Media Browser side-menu item so users enter media management through Media Library and invoke browsing from contextual pickers.
- Aligned media storage under root `storage/public` and `storage/private`, linked frontend public storage to root public storage, and removed the stale server-local storage folder.
- Bumped the workspace to version `1.0.22` and recorded the media manager batch in the changelog.

## 2026-05-22

- Copied and wired tenant settings and sales settings into the active application.
- Added sales list, show, upsert, print template, print page, and print helpers.
- Expanded tenant database provisioning for company, contact, product, sales, and settings surfaces.
- Reworked common master data with reusable autocomplete lookup components and module-oriented common pages.
- Added location relationship seed data for countries, states, districts, cities, and pincodes.
- Added product-oriented common seed data for HSN codes, taxes, units, categories, types, groups, brands, colours, sizes, and styles.
- Reworked contact, company, and product frontend pages for cleaner list, show, and upsert flows.
- Added standalone product feature page routing and documented the rule that module pages must be feature-owned standalone pages.
## 2026-06-25 11:05 pm - Independent Billing deployment

- Added `.container/billing` as the first product-level deployment unit with Platform API, Billing API, and Billing frontend services.
- Kept MariaDB, Redis, the shared Docker network, and media storage external to the application Compose lifecycle.
- Added separate multi-stage Dockerfiles, health checks, build-time frontend service URLs, an Nginx SPA runtime, environment sample, setup helper, and deployment guide.
- Verified Compose config, shell syntax, Platform/Billing/frontend typechecks and builds, documentation progress policy, all three Docker image builds, and API runtime imports.
- Final image sizes: Platform API 408 MB, Billing API 409 MB, Billing frontend 98 MB.

## 2026-06-26 08:52 am - Local Billing stack verification

- Added `.container/billing/billing-stack.sh` as the local-only runner for MariaDB, Redis, Platform API, Billing API, and Billing frontend.
- Added `.container/billing/.env.local.sample` with local URLs and moved the local Billing frontend to `6011` because `6010` can already be occupied by the existing local frontend.
- Made Billing deployment scripts work from WSL on Windows by auto-selecting Docker Desktop's `docker.exe` and converting Compose file/env paths.
- Fixed fresh Billing API Docker builds by using a production-only `tsconfig.build.json` for image compilation and typing the mutation e2e `arrayValue()` helper.
- Verified `bash .container/billing/billing-stack.sh up`, container health, and Windows `curl.exe` health checks for Platform API `6105`, Billing API `6205`, and Billing frontend `6011`.
