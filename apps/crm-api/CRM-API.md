# CRM API

Standalone CRM backend service for tenant CRM routes.

- Default port: `6505`
- Frontend env: `VITE_CRM_API_BASE_URL`
- Route family: `/api/v1/crm`
- Runtime dependency boundary: `@cxsun/platform`; do not import from `apps/server`.
