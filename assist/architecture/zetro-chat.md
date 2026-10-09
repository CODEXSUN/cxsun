# Zetro business assistant

Zetro is a tenant application with its own API and web modules. Platform composes the Zetro routes and mounts its floating drawer in the authenticated tenant shell. The drawer remains open while the user moves between tenant app pages. A full Zetro chat page is also available. Both views use the same tenant and user scoped conversation cache.

## Access and data isolation

Every chat request uses the signed tenant session and the tenant database selected by Platform. Platform checks that Zetro is enabled and that the active user has `zetro.chat.use`. The conversation API reads only conversations owned by that email. Closing a conversation in the UI soft deletes it; the transcript remains available for Super Admin review. If a balance grant is later revoked, stored assistant replies in conversations with successful balance lookups are redacted for that user. Logout clears the browser's Zetro query cache.

The tenant database owns `zetro_conversations`, `zetro_messages`, `zetro_interaction_logs`, `zetro_query_patterns`, `zetro_capability_grants`, `zetro_policy_events`, `zetro_tool_events`, `zetro_review_notes`, `zetro_approval_requests`, and `zetro_provider_settings`. No transcript or tenant provider credential is copied to the Platform master database. Platform access activity stores metadata only. The Zetro migrations are additive for existing tenants; run the tenant app migration after deployment.

The `zetro.chat.v4` catalog change adds the tenant-local `zetro_query_patterns` table and a nullable `pattern_uuid` column to interaction logs. `zetro.chat.v5` records the daily, monthly, and aged sales patterns. The tenant migration function seeds all six built-in rows on an upgrade. It checks UUID, serial number, query contract, and active status for conflicts. These additive changes do not edit earlier logs or Billing data. On a restored local dump, verify six active rows with `SELECT uuid, serial_no, status FROM zetro_query_patterns ORDER BY serial_no`, confirm existing interaction row counts, and check that new requests populate `pattern_uuid`. Do not apply the migration to an unverified database target. The catalog and review page become available after the tracked tenant migration runs.

## Business scope and first capability

The provider classifies each message as business chat, customer outstanding, or off topic. An invalid classification fails closed. General business chat has no tool access and is instructed not to claim it has read records. Off topic requests receive a short business scope response. The classifier does not grant permission.

The versioned business rules and numbered query catalog live in `apps/zetro/agent/skills.md`. General business replies load this file at runtime and fail closed when it is unavailable. The production build copies it to `dist/apps/zetro/agent`. Each interaction log stores the user prompt, Zetro response or failure outcome, intent, pattern UUID, skill key, and SHA-256 rule hash. The tenant database mirrors the built-in catalog. Super Admin can review patterns and tenant-scoped interaction logs at `/sa/zetro` or through `/zetro/admin/tenants/:tenantId/patterns` and `/zetro/admin/tenants/:tenantId/interactions`. New catalog entries are drafts and cannot execute a tool. Review notes support human refinement; they do not change runtime rules or grants automatically.

`billing.customer-outstanding.read` is the first tool capability. No role receives it by default. A Super Admin must activate a tenant local role grant, and the user must also have an active `billing.application.records.view` permission. This keeps staff without a grant from reading all customers. Zetro then checks that Billing is enabled and uses the trusted default company and financial year from the signed session. Billing calculates the balance through its Customer Summary owner. Zetro accepts only an exact customer name or code and formats the result itself; it does not generate SQL or ask the model to invent an amount. Ambiguous names require a code. This release has no write tool.

The next read contracts are `billing.daily-summary.read`, `billing.monthly-summary.read`, and `billing.aged-sales.read`. They use the Billing dashboard owner and the same tenant, role grant, Billing permission, company, and financial year checks. Daily and monthly totals group by currency. They count confirmed sales and purchases and posted receipts and payments. Sales include export sales. The aged sales read shows up to ten oldest confirmed invoices with a remaining balance and an age of at least 30 days. It subtracts posted receipt allocations. These reads do not grant access by default. A Super Admin selects the exact role and capability in `/sa/zetro` and records a reason.

Denied tool attempts create a tenant local event and a pending review request. Super Admin can review the request, record a decision, and separately grant or revoke the role capability. An approved request alone does not execute a tool or activate a role grant. The user must ask again after the grant is active. Failed lookups also create an event. Super Admin access to Zetro review is logged in Platform activity.

## Super Admin API

These endpoints require a signed Super Admin session and are not exposed in the tenant client:

- `GET/PUT /zetro/admin/tenants/:tenantId/grants` lists or changes role grants. A change requires `roleKey`, `capabilityKey`, `status`, and `reason`.
- `GET /zetro/admin/tenants/:tenantId/roles` lists active tenant roles for the grant control.
- `GET/POST /zetro/admin/tenants/:tenantId/patterns` lists the numbered catalog or adds a review-only draft.
- `GET /zetro/admin/tenants/:tenantId/interactions` lists recent prompts, responses, outcomes, and matched pattern UUIDs.
- `GET /zetro/admin/tenants/:tenantId/grants/events` reads the grant and revoke history.
- `GET /zetro/admin/tenants/:tenantId/conversations` lists transcripts, with optional `ownerEmail`.
- `GET /zetro/admin/tenants/:tenantId/conversations/:id` reads a transcript and its notes and tool events.
- `POST /zetro/admin/tenants/:tenantId/conversations/:id/notes` records a review note.
- `GET /zetro/admin/tenants/:tenantId/approvals` lists access requests.
- `POST /zetro/admin/tenants/:tenantId/approvals/:id/decision` records an approval or rejection with a note.

The API routes resolve the target tenant from Platform's registry, then open that tenant's database. A role grant in one tenant has no effect in another.

## Provider and next stages

Tenant administrators can connect Codex CLI in Application Settings > Zetro. The server requires `zetro.provider.manage`; only the `admin` and `super-admin` tenant roles receive it by default. A signed Super Admin can also manage a specific tenant through `GET/PUT /zetro/admin/tenants/:tenantId/provider` and list API models through `GET /zetro/admin/tenants/:tenantId/provider/models`. Provider changes, device sign-in starts, tenant disconnects, and Super Admin access are audited.

The tenant row contains provider kind, URL, model, and an AES-GCM encrypted API key bound to the tenant UUID for API-based connections. Reads never return the key. OpenAI API connections use `https://api.openai.com/v1`; a local OpenAI-compatible endpoint must be on the Platform API host loopback address under `/v1`. A saved tenant connection takes precedence over `CXSUN_ZETRO_BASE_URL`, `CXSUN_ZETRO_API_KEY`, and `CXSUN_ZETRO_MODEL`, which remain deployment fallbacks. Changing `JWT_SECRET` without re-encrypting saved API keys makes them unreadable.

Application Settings > Zetro has Device code and Local Codex tabs. The device flow starts `codex login --device-auth` on the Platform API host using a separate `CODEX_HOME` per tenant. It displays the CLI's one-time code and opens OpenAI's verification page. The administrator enters the code there; the backend polls the CLI's sign-in status and saves the tenant provider selection after success. The Local Codex flow detects the API host's existing Codex CLI sign-in and copies its file-based `auth.json` into this tenant's separate Codex home after checking that the copy can sign in independently. It does not link to the host's live home or copy its chat history and configuration. Keyring-only sign-ins cannot be bound through this flow. Credentials remain in the tenant's host-local Codex home, outside the browser and tenant database. Set `CXSUN_ZETRO_CODEX_HOME_ROOT` to a persistent, service-account-protected directory when running the API outside a desktop development session. Every API replica that serves this tenant needs access to that same credential store, or the tenant must be pinned to the connected host.

The connected settings view reads the ChatGPT account email from the Codex app-server account API. Disconnect runs `codex logout` with that tenant's `CODEX_HOME` and cancels a pending device sign-in. The provider row remains so a later sign-in can restore the connection without changing model settings. A disconnected tenant cannot use the Codex provider until signed in again.

Zetro uses `codex exec` in an ephemeral empty working directory with read-only sandboxing and no approvals. The CLI process receives only the current request and Zetro's business instructions; Zetro's own permission checks determine whether a business record lookup is allowed. The CLI is an agent harness, so production deployment also requires host-level process isolation and credential controls. ChatGPT Desktop does not provide a direct Zetro connection; this flow uses the installed Codex CLI.

Each general business question is sent without prior assistant replies, so a revoked balance answer cannot be replayed from model context. Conversation history remains in the UI. The API stores a user message and answer after the provider responds. The provider sees text that users type, so customers should avoid entering secrets in prompts.

Add future abilities as explicit module-owned read contracts with their own capability keys, role grants, scope checks, and tool-event records. Add write actions only after defining operation specific approval, expiry, idempotency, and confirmation rules. No general database query or arbitrary action endpoint should be exposed to the model.
