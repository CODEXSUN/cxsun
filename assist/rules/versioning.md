# Versioning And Releases

## Version Policy

- Package version format: `1.0.<reference>` (e.g. `1.0.172`).
- Git tags use `v-` prefix: `v-1.0.172`.
- Changelog entry labels use human-readable form: `v 1.0.172`.
- Lockstep versioning across root package and all workspaces.

## Reference Policy

- Every meaningful batch uses a reference number: `#1`, `#2`, etc.
- The batch reference in `assist/execution/task.md` must match `assist/execution/planning.md`.
- App version `1.0.<reference>` derives from the batch reference number.
- Changelog entries use the same ref and local time: `### [v 1.0.10] YYYY-MM-DD h:mm am - Title`.
- Commit subjects use the latest versioned changelog entry as `#<ref> - <title>`, for example `#10 - version update`.

## Changelog Policy

- `assist/documentation/CHANGELOG.md` must contain a `Version State` block at the top.
- `Version State` records: current numeric package version, current `v-` release tag, and the versioned changelog label format.
- Historical changelog entries are immutable. Do not rewrite old entry labels during a version bump.
- Every changelog entry must live under a concrete `## v-<version>` section.
- Do not use an `Unreleased` section.
- Version bump automation may update the `Version State` block and add a concrete version section/entry.
- Every new changelog entry must split notes into `#### Database Changes` and `#### App Codebase Changes`.
- Database schema, migration, seed, tenant provisioning, and data compatibility notes go under `Database Changes`; UI, API, service logic, tooling, and documentation notes go under `App Codebase Changes`.
- Changelog times use the workspace local timezone and lowercase `am` / `pm`.
- During an active version, append progress notes to the latest current-version changelog entry as each meaningful stage is completed.
- Do not wait until the end of a long task to record completed stages. If a module is migrated, a contract is added, a schema rule changes, a test suite is introduced, or a deployment boundary changes, update the changelog in the same work stage.
- Changelog bullets must be specific enough for the next agent to understand what changed without rereading the full diff.
- Do not add vague bullets such as "updated files", "cleanup", or "misc changes".
- Do not create a new version section just because implementation work continued. Continue using the current version section until the user explicitly requests a version bump.
- `npm run github:now` reads the latest versioned changelog entry and must not include changelog dates or timestamps in the Git commit subject.
- `npm run version:bump -- "<title>"` bumps the next patch version across package files, display files, and the changelog top section.
- Version bump automation auto-checks changed database, schema, and migration files and writes `Database update: Yes/No` under `Database Changes`.
- Use `--database-update` or `--no-database-update` to manually override the database update check when needed.

## Version Bump Command Rule

- Version bumps happen only when the user explicitly asks for a version bump or release/version update.
- Do not infer a version bump from normal implementation requests, documentation requests, cleanup requests, test additions, refactors, or module migrations.
- Do not manually edit package versions, lockfile versions, app display versions, release tags, or the changelog `Version State` block unless performing an explicit version bump task.
- If progress must be recorded but no version bump was requested, update the latest existing changelog entry under the current version.
- The preferred command is:

```bash
npm run version:bump -- --title "<title>" --database-update
npm run version:bump -- --title "<title>" --no-database-update
```

- Choose exactly one database flag when the database impact is known.
- After a version bump command, review the generated changelog entry and add precise bullets for the work completed in that version.

## Documentation Progress Rule

- Documentation is part of implementation, not a final optional cleanup.
- At every meaningful stage, update the closest active documentation before marking the stage complete.
- Local module docs must be created or updated in the same patch as module code when a module is added, migrated, renamed, or given new routes, events, queue jobs, sync tags, tables, or tests.
- Central docs must be updated when the change affects users, support, onboarding, deployment, API consumers, module boundaries, or future agent behavior.
- Assist rules/context/execution docs must be updated when the decision affects architecture, service ownership, release process, verification, or AI workflow.
- If a feature is not ready for central client docs, add a short local implementation note explaining why it is still internal.
- Do not finish a code change with undocumented new behavior unless the change is truly invisible plumbing and the changelog explains it.
- When documentation changes, run the active verification required by `assist/rules/verification.md`.
- Run `npm run check:docs-progress` before finalizing work that changes code, service boundaries, rules, documentation workflow, changelog policy, or package versions.

## Release Operation

- Version, changelog, and tag naming must stay aligned in the same batch.
- Release tags use `v-` prefix.
- Validate before tagging a release.
- `npm run github:now` does not bump versions; perform version bumps only as an explicit release task.
- `npm run github:now` must stop for an interactive commit-message review and confirmation before running Git mutations.

## Build Output

- TypeScript builds go to `dist/` per workspace package.
- Framework frontend builds may use native folders (`.next/`, `out/`, etc.).
- Never emit `.js`, `.js.map`, `.d.ts`, or `.d.ts.map` into `src/` or source trees.
