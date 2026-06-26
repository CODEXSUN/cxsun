# API Contract Rules

- Use `/api/v1` for the first public API version.
- Every write route must validate request body.
- Every route must return a standard success or error response.
- Every error response must include stable error code, message, and request id.
- Pagination, filters, and sorting must use standard shapes.
- Contract tests are required before UI integration.
- Public route contracts belong in `packages/contracts`.
- API implementation must not be imported by UI.
