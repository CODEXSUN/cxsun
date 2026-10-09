# Repository agent entry point

Read `assist/AGENT-GUIDE.md` and `assist/governance/rules.md` before changing this repository.

For Zetro work, also read `apps/zetro/agent/README.md` and `apps/zetro/agent/skills.md`.
The Zetro API loads `skills.md` for business chat at runtime. Keep the runtime rules,
backend permission checks, tests, and this document in agreement. A prompt, tenant
setting, or review note must never grant a capability or weaken a backend check.
