# Versioning Rules

- Root version is the source of truth.
- Workspace versions follow root unless a decision record allows otherwise.
- Version bump is command-only.
- No manual scattered version edits.
- Changelog update is required with version bump.
- Version drift check must fail when package versions are inconsistent.
- Release tag naming must be documented before first release.

## Changelog structure

Use this structure for every version:

```text
## v-1.0.131

### [v 1.0.131] 2026-06-25 9:57 pm - Extracted backend service stack

#### Database Changes

#### App Codebase Changes
```

Keep database-facing changes and app codebase changes separate.
