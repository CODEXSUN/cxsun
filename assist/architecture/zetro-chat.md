# Zetro business assistant

Zetro is a tenant application with its own API and web modules. Platform composes the Zetro routes and mounts its floating drawer in the authenticated tenant shell. The drawer remains open while the user moves between tenant app pages. A full Zetro chat page is also available. Both views use the same tenant and user scoped conversation cache.

## Access and data isolation

Every chat request uses the signed tenant session and the tenant database selected by Platform. Platform checks that Zetro is enabled and that the active user has `zetro.chat.use`. The conversation API reads only conversations owned by that email. Closing a conversation in the UI soft deletes it; the transcript remains available for Super Admin review. If a balance grant is later revoked, stored assistant replies in conversations with successful balance lookups are redacted for that user. Logout clears the browser's Zetro query cache.

The tenant database owns `zetro_conversations`, `zetro_messages`, `zetro_capability_grants`, `zetro_policy_events`, `zetro_tool_events`, `zetro_review_notes`, and `zetro_approval_requests`. No transcript is copied to the Platform master database. Platform access activity stores metadata only. The Zetro migration is additive for existing tenants; run the tenant app migration after deployment.

## Business scope and first capability

The provider classifies each message as business chat, customer outstanding, or off topic. An invalid classification fails closed. General business chat has no tool access and is instructed not to claim it has read records. Off topic requests receive a short business scope response. The classifier does not grant permission.

`billing.customer-outstanding.read` is the first tool capability. No role receives it by default. A Super Admin must activate a tenant local role grant, and the user must also have an active `billing.application.records.view` permission. This keeps staff without a grant from reading all customers. Zetro then checks that Billing is enabled and uses the trusted default company and financial year from the signed session. Billing calculates the balance through its Customer Summary owner. Zetro accepts only an exact customer name or code and formats the result itself; it does not generate SQL or ask the model to invent an amount. Ambiguous names require a code. This release has no write tool.

Denied tool attempts create a tenant local event and a pending review request. Super Admin can review the request, record a decision, and separately grant or revoke the role capability. An approved request alone does not execute a tool or activate a role grant. The user must ask again after the grant is active. Failed lookups also create an event. Super Admin access to Zetro review is logged in Platform activity.

## Super Admin API

These endpoints require a signed Super Admin session and are not exposed in the tenant client:

- `GET/PUT /zetro/admin/tenants/:tenantId/grants` lists or changes role grants. A change requires `roleKey`, `status`, and `reason`.
- `GET /zetro/admin/tenants/:tenantId/grants/events` reads the grant and revoke history.
- `GET /zetro/admin/tenants/:tenantId/conversations` lists transcripts, with optional `ownerEmail`.
- `GET /zetro/admin/tenants/:tenantId/conversations/:id` reads a transcript and its notes and tool events.
- `POST /zetro/admin/tenants/:tenantId/conversations/:id/notes` records a review note.
- `GET /zetro/admin/tenants/:tenantId/approvals` lists access requests.
- `POST /zetro/admin/tenants/:tenantId/approvals/:id/decision` records an approval or rejection with a note.

The API routes resolve the target tenant from Platform's registry, then open that tenant's database. A role grant in one tenant has no effect in another.

## Provider and next stages

Set `CXSUN_ZETRO_BASE_URL` to an OpenAI-compatible `/v1` URL, `CXSUN_ZETRO_API_KEY` to a server-side credential, and `CXSUN_ZETRO_MODEL` to a model identifier. Each general business question is sent without prior assistant replies, so a revoked balance answer cannot be replayed from model context. Conversation history remains in the UI. The API stores a user message and answer after the provider responds. The provider sees text that users type, so customers should avoid entering secrets in prompts.

Add future abilities as explicit module-owned read contracts with their own capability keys, role grants, scope checks, and tool-event records. Add write actions only after defining operation specific approval, expiry, idempotency, and confirmation rules. No general database query or arbitrary action endpoint should be exposed to the model.
