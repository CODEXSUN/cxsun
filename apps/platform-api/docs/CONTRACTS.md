# Platform API Contracts

This document lists the intended contract surface for future app services.

## Current Scaffold Surface

The first scaffold exposes only existing transition-backend foundation modules:

- `GET /health`
- `POST /api/v1/auth/login`
- tenant APIs from the existing Tenant module
- tenant-domain APIs from the existing Tenant Domain module
- industry APIs from the existing Industry module

The current surface is imported from `apps/server` and is not yet a stable external service contract.

## Future Stable Contracts

Billing, Ecommerce, CRM, Sites, and other app services should depend on Platform API for:

- Validate session/service token
- Resolve tenant by host/domain/code
- Read tenant app enablement
- Read user identity and role
- Check RBAC policy
- Read company/accounting year context
- Send mail through a platform-owned contract
- Create notification
- Store/read file metadata
- Write audit event

## Contract Rule

When a business service needs shared platform data, add or use a Platform API contract. Do not read Platform-owned tables directly from the business service unless a temporary migration note explicitly allows it.

## Response Rule

Prefer small, typed responses for service-to-service calls. Example shape:

```json
{
  "ok": true,
  "tenant": {
    "code": "aaran",
    "status": "active"
  }
}
```
