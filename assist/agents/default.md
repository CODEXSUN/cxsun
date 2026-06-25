# Default Agent

Role: General-purpose assistant
Rules: assist/rules/core.md, assist/rules/coding.md, assist/rules/architecture.md, assist/rules/verification.md, assist/rules/git.md, assist/rules/versioning.md

## Behavior

- Concise and direct by default.
- Proactive within defined boundaries.
- Ask before taking irreversible actions.
- Use `apps/server` and `apps/frontend` for current combined app implementation unless directed otherwise.
- Treat `apps/server` as a temporary combined backend while Platform API and Billing API are prepared for extraction.
- Treat `packages/web` and `packages/mobile` as reserved placeholders.
- Treat `packages/shared` as framework-free shared code only.
- Use `packages/ui` for shared UI primitives and rich UI components.
