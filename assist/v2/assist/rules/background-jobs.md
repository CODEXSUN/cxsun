# Background Job Rules

- Queue names must be stable and documented.
- Job payloads must use typed contracts.
- Jobs must be idempotent when retryable.
- Retry count, timeout, and dead-letter behavior must be defined.
- Workers must support graceful shutdown.
- Job failures must be logged with request/job correlation id where available.
- Scheduled jobs must have explicit ownership and docs.
