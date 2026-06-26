# Git Rules

- No direct push to main.
- Work on feature branches.
- Commit only after relevant verification passes.
- Push only after `npm run check` passes.
- PR description must include changed boundary, verification, and docs update.
- Lockfile changes must be intentional.
- No unrelated formatting churn.
- Generated files must be reviewed before commit.

## Commit message format

Use this format:

```text
#<version-number> - <short release/task title>
```

Example:

```text
#131 - Extracted backend service stack
```

For version `1.0.131`, use `#131`.

For version `1.0.0`, use `#0`.

## Push rule

Before push:

- [ ] `npm run check` passes.
- [ ] Changelog is updated.
- [ ] Prompt log is updated when the user request changed architecture, rules, execution, code, deployment, dependencies, or verification.
- [ ] No file is over 700 lines.
- [ ] No unrelated files are included.

Push only the active branch. Do not push main directly.
