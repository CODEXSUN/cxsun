# Sync Rules

- Sync message contracts must be typed.
- Sync producers and consumers must use explicit interfaces.
- Sync messages must be idempotent where retryable.
- Sync conflicts must have a documented handling pattern before business sync is added.
- Sync failures must record evidence.
- Sync retries must be bounded.
