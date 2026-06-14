---
sidebar_position: 5
title: Release And Versioning
---

# Release And Versioning

CXSun uses lockstep workspace versioning in the `1.0.<reference>` format.

## Version Bump

Use:

```bash
npm run version:bump -- --title "release title"
```

Use a manual database classification when needed:

```bash
npm run version:bump -- --title "release title" --database-update
npm run version:bump -- --title "release title" --no-database-update
```

## Changelog Split

Every new changelog entry must split notes into:

- `Database Changes`: schema, migration, seed, tenant provisioning, database compatibility, and installed database version changes.
- `App Codebase Changes`: UI, API, service logic, tooling, documentation, and non-database behavior changes.

The version bump script creates this structure automatically.
