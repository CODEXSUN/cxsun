# Auditor API

Standalone Auditor backend service.

- Default port: `6545`
- Frontend env: `VITE_AUDITOR_API_BASE_URL`
- Route families: `/api/v1/auditor/clients`, `/api/v1/auditor/contact-credentials`, `/api/v1/auditor/gst-filings`
- Runtime dependency boundary: `@cxsun/platform`; do not import from `apps/server`.
