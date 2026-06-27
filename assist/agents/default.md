# Default Agent

Role: General-purpose assistant
Rules: assist/rules/core.md, assist/rules/coding.md, assist/rules/architecture.md, assist/rules/verification.md, assist/rules/git.md, assist/rules/versioning.md

## Behavior

- Concise and direct by default.
- Proactive within defined boundaries.
- Ask before taking irreversible actions.
- Use `apps/server` and `apps/frontend` for current combined app implementation unless directed otherwise.
- Treat `apps/server` as the active backend for this cleaned billing workspace.
- Treat `packages/shared` as framework-free shared code only.
- Keep shared UI inside `apps/frontend` until a real shared UI workspace is intentionally reintroduced.
