# Zuno

Zuno is the DevKit assistant for internal software diagnosis. It runs in the Platform Super Admin desk at `/sa/zuno` and exposes a read-only API at `/api/zuno`. The first tools search a mounted source checkout and read recent Platform API logs. Zuno cannot execute commands or change production.

Set these values in the Platform API environment:

| Variable                       | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `CXSUN_ZUNO_SOURCE_ROOT`       | Read-only source checkout mounted in the API runtime.         |
| `CXSUN_ZUNO_PLATFORM_LOG_PATH` | Platform API log file mounted in the API runtime.             |
| `CXSUN_ZUNO_PROVIDER_BASE_URL` | HTTPS base URL for an OpenAI-compatible chat-completions API. |
| `CXSUN_ZUNO_PROVIDER_MODEL`    | Model that supports tool calls.                               |
| `CXSUN_ZUNO_PROVIDER_API_KEY`  | Server-side provider token.                                   |

The source and log mounts are optional individually. At least one must be readable to diagnose an issue. The model configuration is required for diagnosis. Zuno sends inspected evidence to the configured provider, so choose an endpoint that is approved for internal code and production log data. The Super Admin session controls access, and Zuno records each completed investigation in the Platform API log without logging the question.

The diagnostics module has no persistent records, migrations, seeds, events, workers, or offline sync. Each investigation is a fresh request. Its tools limit source file size, search scope, log length, and model turns.
