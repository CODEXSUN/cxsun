# Zetro chat

Zetro is a tenant application with a chat frontend in `apps/zetro/web` and a chat API in `apps/zetro/api`. Platform registers the routes, checks that the tenant has the `zetro` module enabled, and requires `zetro.chat.use` for each request. The app seed grants that permission to active admin, super-admin, and user roles. Conversation reads and writes are scoped to the signed-in email in the selected tenant database. Platform records message creation and conversation deletion in tenant access activity without logging prompt text.

The tenant database stores conversations in `zetro_conversations` and messages in `zetro_messages`. The migration creates both tables when the app is provisioned. Existing tenants must run the app provisioning migration and permission seed after enabling Zetro. Rolling the app back drops its conversation history.

Set `CXSUN_ZETRO_BASE_URL` to the provider's OpenAI-compatible `/v1` base URL, `CXSUN_ZETRO_API_KEY` to a server-side credential, and `CXSUN_ZETRO_MODEL` to a model identifier. The API sends up to 20 prior messages plus the new prompt to `/chat/completions`. It stores a user message and assistant reply only after the provider succeeds. The first release offers private chat history, new chats, and deletion. It has no access to business records and cannot carry out business actions.
