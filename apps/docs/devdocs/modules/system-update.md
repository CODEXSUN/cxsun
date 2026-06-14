---
title: System Update
---

# System Update Module

System Update coordinates controlled application updates from the super-admin surface.

## Responsibilities

- Check local and cloud package versions.
- Run update steps such as dependency install, database migration, frontend build, backend build, restart, and health checks.
- Record recent update state for operators.

## Safety

Database backups should be created before update operations when a restore point is required.
