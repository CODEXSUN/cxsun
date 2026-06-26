# AI Rules

## Primary rule

CODEXSUN starts from a clean foundation. Use only the structure defined in this assist guide.

The goal is to create a foundation that can grow without hidden coupling.

## Current phase

Foundation only.

Allowed:

- repository setup
- workspace setup
- root framework
- contracts package
- config package
- testing package
- events package
- queue package
- sync package
- UI primitives package
- Platform modular monolith app
- documentation structure
- deployment structure
- verification scripts

Not allowed:

- business modules
- business tables
- business forms
- business workflows
- app-specific modules

## Stop rules

Stop and report if a requested change requires:

- business table design
- business form design
- business workflow design
- app-specific module implementation
- dependency from framework to Platform
- dependency from packages to apps
- one app importing another app private code
- deployment coupling between apps
- unreviewed dependency upgrades
- version changes outside command flow
- direct push to main
- system update without preflight
