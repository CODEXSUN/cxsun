# CODEXSUN Assist

This assist folder is the operating guide for AI agents creating CODEXSUN from scratch.

CODEXSUN is a scalable business application platform.

## Mandatory read order

Before any work, read:

1. `assist/README.md`
2. `assist/rules/ai-rules.md`
3. `assist/rules/scope-control.md`
4. `assist/rules/architecture.md`
5. `assist/rules/app-boundaries.md`
6. `assist/rules/dependency-boundaries.md`
7. `assist/rules/coding.md`
8. `assist/rules/tech-pack.md`
9. `assist/rules/api-contracts.md`
10. `assist/rules/database.md`
11. `assist/rules/security.md`
12. `assist/rules/observability.md`
13. `assist/rules/background-jobs.md`
14. `assist/rules/sync.md`
15. `assist/rules/frontend.md`
16. `assist/rules/deployment.md`
17. `assist/rules/release.md`
18. `assist/rules/versioning.md`
19. `assist/rules/git.md`
20. `assist/rules/npm-updates.md`
21. `assist/rules/system-update.md`
22. `assist/rules/documentation.md`
23. `assist/rules/verification.md`
24. `assist/documentation/changelog.md`
25. `assist/documentation/prompt-log.md`
26. The active execution task under `assist/execution/`

## Execution order

Use execution files in order:

1. `assist/execution/task_1.md` - foundation standards before build
2. `assist/execution/task_2.md` - create CODEXSUN foundation
3. `assist/execution/task_3.md` - implement Platform foundation modules
4. `assist/execution/task_4.md` - architecture hardening before business apps
5. `assist/execution/task_5.md` - central frontend UI and design system
6. `assist/execution/task_6.md` - version bump and GitHub helper
7. `assist/execution/task_7.md` - start first app backend and frontend
8. `assist/execution/task_8.md` - frontend Vite, Tailwind, shadcn, and package stack
9. `assist/execution/task_9.md` - backend runtime tech pack and preflight

Do not execute a later task before the earlier task is complete.

A task is complete only when its completion response is produced and required verification is run or clearly explained.

## Foundation rule

Do not create business tables, business forms, business workflows, or app-specific modules during the foundation tasks.

## Future app rule

CODEXSUN is one codebase with separately deployable app containers. Planned app names are `platform`, `billing`, `ecommerce`, `sites`, `crm`, `taskmanager`, `auditor`, and `tirupur-connect`. Apps must communicate only through APIs, events, queues, or sync contracts.

## Scope control

- Do not write files over 700 lines.
- Do not overthink beyond the active task.
- Do not overcode beyond the active boundary.
- If a file approaches 600 lines, split it before continuing.
- If a requirement belongs to a later task, document it and stop.

## Finalization rule

This assist baseline is finalized. Do not change these rules during implementation unless the user explicitly asks to revise the foundation standard.

## Required final response from AI agents

Every final response must include:

- changed files
- boundary affected
- verification run
- failed or skipped checks with reason
- next recommended task
