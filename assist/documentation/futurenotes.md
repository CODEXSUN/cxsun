# Future Notes

## Scale Review Trigger

At present, the app has no real user load and only around 10 users are expected to use it.

The current cloud setup is acceptable for this early stage. When usage grows toward 50 active users, especially with simultaneous Sales and Purchase actions across different tenants, review scaling before treating it as normal production load.

Items to review at that point:

- Make tenant database pool limits configurable instead of fixed.
- Tune MariaDB `max_connections` according to server RAM.
- Consider multiple backend worker processes.
- Move production frontend serving away from Vite preview when needed.
- Run a small load test for Sales and Purchase list/save/print flows.

This is not urgent now. Revisit when real concurrent usage starts increasing.

## Laravel-Inspired Platform Maturity Ideas

These notes are not about moving CXSun to Laravel. They are a comparison list of mature Laravel-style logic and platform features that would help CXSun scale while keeping the current TypeScript, React, MariaDB, and tenant-module architecture.

High-priority ideas:

- Build a stronger queue system like Laravel Queue/Horizon: named queues, retries, failed jobs, delay, backoff, per-tenant job visibility, worker health, and a queue dashboard.
- Add rate limiting for login, public forms, GST/Tally sync, mail sending, imports, public site APIs, and other expensive tenant actions.
- Add a first-class scheduler for recurring jobs such as backups, mail retry, GST reminders, task campaigns, stale lead follow-up, subscription reminders, and tenant health checks.
- Add a policy/gate layer so every module can ask `can(user, action, resource)` instead of relying only on menu visibility and route checks.
- Add a domain event/listener system for actions such as invoice created, mail queued, task assigned, TConnect supplier submitted, payment received, and Tally sync requested.
- Add typed request validation per endpoint with one consistent API error shape, similar to Laravel form requests.

Next-priority ideas:

- Make audit logging a shared engine for all modules, recording tenant, company, user, action, old/new values, IP/device, and source module.
- Build a shared notification system with in-app records first, then email and WhatsApp/SMS adapters later.
- Add predictable cache helpers for tenant context, permissions, software settings, public site content, app access, menus, and dashboard counters.
- Build an observability/support dashboard similar in spirit to Telescope/Pulse: request logs, slow queries, failed jobs, mail activity, queue metrics, API errors, and tenant database health.
- Add testing factories and seeders for tenants, companies, contacts, products, invoices, tasks, and TConnect records.
- Improve file storage into a clear disk abstraction for local/S3-style storage, signed URLs, private/public media, ownership, and cleanup jobs.

Best next roadmap slice:

1. Queue and failed-job dashboard.
2. Scheduler.
3. Policies/gates.
4. Request validation.
5. Shared audit log.
6. Notifications.
