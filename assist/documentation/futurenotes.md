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
