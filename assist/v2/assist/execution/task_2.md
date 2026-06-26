# TASK 2 - Create CODEXSUN Foundation

Do not execute this task until Task 1 is complete.

Create CODEXSUN from scratch with:

- root framework
- shared packages
- base Platform app
- AI assist files
- documentation files
- test structure
- deployment structure
- migration folders
- seeder folders
- dependency boundary checks
- version checks

Do not create business tables, business forms, or business workflows.

Required root:

```text
CODEXSUN/
|-- apps/
|   |-- platform/
|   |-- billing/
|   |-- ecommerce/
|   |-- sites/
|   |-- crm/
|   |-- taskmanager/
|   |-- auditor/
|   `-- tirupur-connect/
|-- framework/
|-- packages/
|-- docs/
|-- assist/
|-- tools/
|-- scripts/
`-- docker/
```

Create only `apps/platform` implementation in this task. Reserve the other app folders with README boundary files only if needed by the task. Do not implement their business modules.

Each future app must follow:

```text
apps/<app-name>/
|-- framework/
|-- platform/
|-- <app-name>/
|-- api/
|-- web/
|-- worker/
|-- tests/
|-- docker/
|-- config/
|-- docs/
`-- <app-name>.md
```

Required future app rule:

- app has own container
- app has own API port
- app has own web port
- app is tenant-aware
- app is industry-aware
- app talks to other apps only through API/events/queue/sync
- app deploy does not touch unrelated app containers

## Completion response

Report:

- root structure created
- framework structure created
- package structure created
- Platform app structure created
- assist files created
- docs created
- verification commands run
- unresolved decisions
- whether Task 3 can start
