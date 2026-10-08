# Zuno

Zuno is the DevKit assistant for production support. It runs in the Platform Super Admin desk at `/sa/zuno`. Its workspace has three areas:

1. **Watch** reads Platform database backup runs, database availability, recent queue jobs, and recent Platform API response times. A backup is fresh when a completed run is within 36 hours. This is an observation, not a restore test or an automatic backup schedule.
2. **Investigate** uses a provider-neutral chat completion API with bounded, read-only source search and Platform log tools.
3. **Cases** persist support work in the Platform master database. Each case records its target tenant, severity, proposal, approval, execution result, verification, and append-only activity.

For an emergency client data correction, create a `data_correction` case, save the proposed action, and enter the exact table, text column, numeric row ID, current value, and replacement. Zuno previews the current row and saves the SQL plan. After Super Admin approval, **Execute approved SQL** runs one parameterized update against the server-resolved tenant database. Execution requires a completed tenant backup within 36 hours, a non-key text field with a supported name, an integer primary `id`, and an unchanged current value. The update must affect exactly one row. If the process stops during execution, **Reconcile interrupted execution** reads the row before allowing a retry or completion. Zuno does not execute arbitrary SQL or DDL. Changes to table structure must use the tracked migration runbook and production preflight; code changes follow normal source review and deployment.

Set these values in the Platform API environment:

| Variable                       | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `CXSUN_ZUNO_SOURCE_ROOT`       | Read-only source checkout mounted in the API runtime.         |
| `CXSUN_ZUNO_PLATFORM_LOG_PATH` | Platform API log file mounted in the API runtime.             |
| `CXSUN_ZUNO_PROVIDER_BASE_URL` | HTTPS base URL for an OpenAI-compatible chat-completions API. |
| `CXSUN_ZUNO_PROVIDER_MODEL`    | Model that supports tool calls.                               |
| `CXSUN_ZUNO_PROVIDER_API_KEY`  | Server-side provider token.                                   |

The source and log mounts are optional individually. At least one must be readable to diagnose an issue. The model configuration is required for diagnosis. Zuno sends inspected evidence to the configured provider, so choose an endpoint that is approved for internal code and production log data. The Super Admin session controls access. Zuno records each completed investigation in the Platform API log without logging the question. Cases and SQL activity are stored in Zuno's Platform master tables.

The diagnostics module has no persistent records, migrations, seeds, events, workers, or offline sync. Each investigation is a fresh request. Its tools limit source file size, search scope, log length, and model turns. The cases module owns the `zuno_cases` and `zuno_case_activity` migration. The watch module is read-only and samples available operational records; it does not replace a metrics time series, alert delivery, or backup scheduler.
