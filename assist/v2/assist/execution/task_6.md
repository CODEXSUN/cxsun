# TASK 6 - Version Bump And GitHub Helper

Execute this task after Task 5 is complete.

Do not create business tables, business forms, or business workflows in this task.

## Objective

Create command-only version bump and GitHub commit/push helpers for CODEXSUN.

The helper must follow the same operating pattern:

- `npm run version:bump`
- `npm run github:now`
- changelog-driven commit subject
- interactive review before git mutation
- no manual scattered version edits

## Required package.json scripts

Add these root scripts:

```json
{
  "scripts": {
    "version:bump": "node tools/version-bump.mjs",
    "github:now": "node tools/github-helper.mjs",
    "check:versions": "node tools/check-versions.mjs"
  }
}
```

## Required helper files

```text
tools/
|-- changelog.mjs
|-- version-bump.mjs
|-- github-helper.mjs
`-- check-versions.mjs
```

Each helper file must stay under 700 lines.

## Version policy

- Version format is `1.0.<reference>`.
- Root `package.json` version is source of truth.
- Workspace package versions must match root version.
- Version bump increments patch/reference only.
- Version bump is command-only.
- Changelog `Version State` must update with version bump.
- Changelog entry must use:

```text
## v-1.0.131

### [v 1.0.131] 2026-06-25 9:57 pm - Extracted backend service stack

#### Database Changes

#### App Codebase Changes
```

## Commit subject policy

`github:now` must read the latest versioned changelog entry and create this default commit subject:

```text
#131 - Extracted backend service stack
```

Do not include changelog date or timestamp in the commit subject.

## `tools/changelog.mjs` sample

```js
import { readFileSync } from 'fs'
import { join } from 'path'

export const CHANGELOG_PATH = join('assist', 'documentation', 'changelog.md')

export function parseLatestVersionedChangelogEntry(content) {
  const match = content.match(
    /^### \[v\s+(\d+)\.(\d+)\.(\d+)\]\s+\d{4}-\d{2}-\d{2}\s+(?:[1-9]|1[0-2]):[0-5]\d\s+(?:am|pm)\s+-\s+(.+)$/m,
  )
  if (!match) throw new Error(`Could not read latest versioned changelog entry from ${CHANGELOG_PATH}.`)
  return {
    reference: Number.parseInt(match[3], 10),
    title: String(match[4] ?? '').trim(),
    version: `${match[1]}.${match[2]}.${match[3]}`,
  }
}

export function readLatestVersionedChangelogEntry(rootDir) {
  return parseLatestVersionedChangelogEntry(readFileSync(join(rootDir, CHANGELOG_PATH), 'utf8'))
}

export function formatChangelogCommitSubject(entry) {
  return `#${entry.reference} - ${entry.title}`
}
```

## `tools/version-bump.mjs` implementation rule

The helper must:

- [ ] read root `package.json`
- [ ] calculate next patch version
- [ ] update root `package.json`
- [ ] update every workspace `package.json`
- [ ] update `package-lock.json`
- [ ] update `assist/documentation/changelog.md` Version State
- [ ] insert a new changelog entry after `---`
- [ ] add `Database update: Yes/No`
- [ ] support `--title "<title>"`
- [ ] support `--database-update`
- [ ] support `--no-database-update`
- [ ] auto-detect database update from changed migration/database/schema files when no override is given

Command examples:

```bash
npm run version:bump -- --title "Initial foundation" --no-database-update
npm run version:bump -- --title "Tenant schema foundation" --database-update
```

## `tools/github-helper.mjs` implementation rule

The helper must:

- [ ] read latest changelog entry
- [ ] create default commit subject from changelog
- [ ] show changed file count
- [ ] show changed files
- [ ] ask whether to bump version before commit
- [ ] ask for version title when bumping
- [ ] ask for commit message confirmation
- [ ] run `git pull --rebase --autostash`
- [ ] run `git add -A`
- [ ] run `git commit -m "<subject>"`
- [ ] run `git push`
- [ ] stop if user rejects confirmation

Command:

```bash
npm run github:now
```

## `tools/check-versions.mjs` implementation rule

The helper must:

- [ ] read root version
- [ ] scan all workspace package versions
- [ ] fail if any workspace version differs
- [ ] verify changelog Version State matches root version
- [ ] verify release tag matches `v-<version>`
- [ ] verify changelog label matches `v <version>`
- [ ] print clear failure messages

Command:

```bash
npm run check:versions
```

## Strict coding rules

- [ ] Do not manually edit versions outside the helper.
- [ ] Do not commit without changelog entry.
- [ ] Do not push without `npm run check`.
- [ ] Do not hide Git mutation behind non-interactive defaults.
- [ ] Do not exceed 700 lines per helper file.
- [ ] Keep changelog parsing in `tools/changelog.mjs`.
- [ ] Keep version mutation in `tools/version-bump.mjs`.
- [ ] Keep git mutation in `tools/github-helper.mjs`.
- [ ] Keep validation in `tools/check-versions.mjs`.

## Verification

Run:

- [ ] `npm run check:versions`
- [ ] `npm run version:bump -- --title "Version helper test" --no-database-update`
- [ ] verify versions changed consistently
- [ ] verify changelog entry structure
- [ ] revert the test bump if it was only a helper test
- [ ] `npm run check`

## Completion response

Report:

- helper files created
- package scripts added
- changelog behavior verified
- version check behavior verified
- github helper behavior verified
- verification commands run
- unresolved decisions
