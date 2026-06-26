# HOME

## Summary
A minimal root endpoint that renders a health-check welcome page for the server. Displays server status, timestamp, and a redirect link to the configured frontend URL.

## What We Done
- Single `GET /` route returning an HTML welcome page with server status
- Auto-redirect to frontend URL after 8 seconds via `<meta http-equiv="refresh">`
- Dark/light mode CSS styling
- Server timestamp display
- HTML escaping for safe rendering of dynamic values

## Gaps
- No JSON health check endpoint for programmatic monitoring
- No API versioning or structured response
- No metrics or uptime information
- No database connectivity check

## Future Concepts
- JSON health check endpoint (`/api/health`) with DB, cache, queue status
- Uptime and version information display
- API documentation landing page (Swagger/OpenAPI)
