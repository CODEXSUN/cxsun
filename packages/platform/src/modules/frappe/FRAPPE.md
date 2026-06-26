# Frappe Integration

Tenant Frappe settings live in `frappe_settings` and are scoped to the selected default company. The first supported workflow is handshake-first:

- Save base URL, site name, API token, API secret, default company, and default warehouse.
- Validate with `GET /api/method/frappe.auth.get_logged_user`.
- Use `Authorization: token <api_key>:<api_secret>` and optional `x-frappe-site-name`.
- Enable remote DocType preview/post only after a successful handshake.

Current API surface:

- `GET /api/v1/frappe`
- `POST /api/v1/frappe/settings`
- `POST /api/v1/frappe/validate-connection`
- `GET /api/v1/frappe/records?doctype=Item`
- `POST /api/v1/frappe/records`
- `POST /api/v1/frappe/sync-jobs`
