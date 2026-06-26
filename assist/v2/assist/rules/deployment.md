# Deployment Rules

- Every deployable unit must have its own Dockerfile.
- Local dependency containers must be separate from app containers.
- App containers must not create database infrastructure.
- Every API app must expose `/health`.
- Every API app must expose `/ready`.
- Deploy docs must define rollback.
- Deploy docs must define environment variables.
- Deploy docs must define per-app failure behavior.
- A failing app must not block another app unless shared framework/package contracts fail.
- Billing, ecommerce, sites, crm, taskmanager, auditor, and tirupur-connect must have separate containers when implemented.
- Each app container must be buildable and deployable without touching unrelated app containers.
- Each app must have reserved API and web ports by app name.
- Each app must have app-specific health and readiness checks.
- Each app deployment must receive tenant and industry configuration explicitly.
