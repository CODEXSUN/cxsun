# Frappe API

Standalone Frappe integration backend service.

- Default port: `6525`
- Frontend env: `VITE_FRAPPE_API_BASE_URL`
- Route family: `/api/v1/frappe`
- Runtime dependency boundary: `@cxsun/platform`; do not import from `apps/server`.
