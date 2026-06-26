# Observability Rules

- Every request must have a request id.
- Every response must include request id header.
- Server logs must be structured.
- Logs must include timestamp, level, request id, app, module, route, status, and duration.
- Error responses must include request id.
- Slow request threshold must be configured.
- Slow database query threshold must be configured.
- Health and readiness endpoints are required for API apps.
- Audit events are required for Platform actions.
