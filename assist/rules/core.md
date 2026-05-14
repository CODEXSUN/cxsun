# Core Rules

- Read `assist/README.md` first to understand the system.
- Read `assist/rules/` and `assist/context/` before implementation work.
- Always confirm before running destructive commands such as delete, reset, force push, or killing unknown processes.
- Do not commit secrets, credentials, or `.env` files.
- Follow existing project conventions. Match style, imports, file placement, and naming.
- Use `apps/server` and `apps/frontend` as the active implementation targets unless the user explicitly asks for another workspace.
- Run targeted lint/typecheck/build commands after making code changes when available.
- Keep responses concise. Avoid unnecessary explanation unless asked.
- Only create commits, tags, branches, or pull requests when explicitly requested.
- At session start, refresh `assist/execution/planning.md` and `assist/execution/task.md` for the current session.
- Before starting work on each prompt, copy the exact user message into `assist/documentation/prompt-review.md`.
