# Session Plan

**Date:** 2026-06-10  
**Version:** 1.0.91  
**Focus:** Frappe integration app foundation.

## Objective

Create a first-class Frappe app/module in the tenant workspace with backend and frontend wiring. The initial finish line is the handshake and connection setting page, plus a small DocType read/post bridge so later Contact/Product/Sales/Purchase sync work has a real integration surface.

## Architecture Boundary

- Frappe belongs in the tenant/client dashboard, not super-admin platform orchestration.
- Tenant settings are scoped to the selected default company.
- The live handshake uses Frappe API token auth: `Authorization: token <api_key>:<api_secret>`.
- The handshake endpoint is `GET /api/method/frappe.auth.get_logged_user`.
- Optional site routing uses `x-frappe-site-name`.
- Remote operations remain blocked until the handshake succeeds.

## Current Slice

1. Add backend tables and APIs for Frappe settings, sync jobs, record activity, handshake, DocType GET, and DocType POST.
2. Register tenant provisioning and backend module imports.
3. Add a Frappe frontend feature with connection settings, handshake status, DocType workbench, jobs, and record activity.
4. Wire the Frappe app into the dashboard app switch, side menu, breadcrumb labels, and route renderer.

## Verification

- `npm -w apps/server run typecheck`
- `npm -w apps/frontend run typecheck`
