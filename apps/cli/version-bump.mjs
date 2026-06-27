#!/usr/bin/env node

import { execFileSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { pathToFileURL } from 'url'

const VERSION_FILES = [
  'package.json',
  'apps/cli/package.json',
  'apps/frontend/package.json',
  'apps/server/package.json',
  'packages/shared/package.json',
]

const DISPLAY_FILES = [
  'README.md',
  'assist/README.md',
  'apps/frontend/index.html',
]

export function bumpNextVersion(rootDir, title = 'version update', options = {}) {
  const currentVersion = readRootVersion(rootDir)
  const nextVersion = bumpPatch(currentVersion)
  const databaseUpdate = resolveDatabaseUpdate(rootDir, options.databaseUpdate)

  for (const file of VERSION_FILES) {
    updatePackageVersion(resolve(rootDir, file), nextVersion)
  }

  updatePackageLock(resolve(rootDir, 'package-lock.json'), currentVersion, nextVersion)
  updateDisplayFiles(rootDir, currentVersion, nextVersion)
  updateChangelog(rootDir, nextVersion, title, databaseUpdate)

  return {
    currentVersion,
    nextVersion,
    reference: Number.parseInt(nextVersion.split('.')[2] ?? '0', 10),
    title,
    databaseUpdate,
  }
}

function readRootVersion(rootDir) {
  const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'))

  if (!pkg.version) {
    throw new Error('Root package.json does not contain a version.')
  }

  return String(pkg.version)
}

function bumpPatch(version) {
  const parts = version.split('.')
  const patch = Number.parseInt(parts[2] ?? '0', 10)

  if (parts.length !== 3 || !Number.isInteger(patch)) {
    throw new Error(`Unsupported version format: ${version}`)
  }

  parts[2] = String(patch + 1).padStart(2, '0')
  return parts.join('.')
}

function updatePackageVersion(file, nextVersion) {
  if (!existsSync(file)) {
    return
  }

  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  pkg.version = nextVersion
  writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8')
}

function updatePackageLock(file, currentVersion, nextVersion) {
  if (!existsSync(file)) {
    return
  }

  const lock = JSON.parse(readFileSync(file, 'utf8'))

  if (lock.version === currentVersion) {
    lock.version = nextVersion
  }

  for (const pkg of Object.values(lock.packages ?? {})) {
    if (pkg && typeof pkg === 'object' && pkg.version === currentVersion) {
      pkg.version = nextVersion
    }
  }

  writeFileSync(file, `${JSON.stringify(lock, null, 2)}\n`, 'utf8')
}

function updateDisplayFiles(rootDir, currentVersion, nextVersion) {
  for (const file of DISPLAY_FILES) {
    const fullPath = resolve(rootDir, file)

    if (!existsSync(fullPath)) {
      continue
    }

    const content = readFileSync(fullPath, 'utf8').replaceAll(
      currentVersion,
      nextVersion,
    )
    writeFileSync(fullPath, content, 'utf8')
  }
}

function updateChangelog(rootDir, nextVersion, title, databaseUpdate) {
  const file = resolve(rootDir, 'assist/documentation/CHANGELOG.md')
  let content = readFileSync(file, 'utf8')
  const label = `v ${nextVersion}`
  const tag = `v-${nextVersion}`

  content = content
    .replace(/- \*\*Current version:\*\* `[\d.]+`/, `- **Current version:** \`${nextVersion}\``)
    .replace(/- \*\*Release tag:\*\* `v-[\d.]+`/, `- **Release tag:** \`${tag}\``)
    .replace(/- \*\*Changelog label:\*\* `v [\d.]+`/, `- **Changelog label:** \`${label}\``)

  const entry = [
    `## ${tag}`,
    '',
    `### [${label}] ${formatLocalTimestamp(new Date())} - ${title}`,
    '',
    '#### Database Changes',
    '',
    `- Database update: ${databaseUpdate.hasUpdate ? 'Yes' : 'No'}${databaseUpdate.mode === 'auto' ? ' (auto-check)' : ' (manual)'}.`,
    '',
    '#### App Codebase Changes',
    '',
    `- Bumped workspace version to ${nextVersion}`,
    '',
  ].join('\n')

  content = content.replace(/(\r?\n---\r?\n\r?\n)/, `$1${entry}`)
  writeFileSync(file, content, 'utf8')
}

function formatLocalTimestamp(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = date.getHours()
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const suffix = hours >= 12 ? 'pm' : 'am'
  const hour12 = hours % 12 || 12

  return `${year}-${month}-${day} ${hour12}:${minutes} ${suffix}`
}

function parseTitleArg(argv) {
  const filteredArgs = argv.filter((arg, index) => {
    if (arg === '--database-update' || arg === '--db-update' || arg === '--db') return false
    if (arg === '--no-database-update' || arg === '--no-db-update' || arg === '--no-db') return false
    if (arg.startsWith('--database-update=')) return false
    if (arg === '--title' || arg === '-t') return true
    const previous = argv[index - 1]
    return previous !== '--title' && previous !== '-t'
  })
  const titleIndex = argv.findIndex((arg) => arg === '--title' || arg === '-t')
  if (titleIndex >= 0) {
    return argv[titleIndex + 1] ?? 'version update'
  }

  return filteredArgs.join(' ').trim() || 'version update'
}

function parseDatabaseUpdateArg(argv) {
  if (argv.some((arg) => arg === '--database-update' || arg === '--db-update' || arg === '--db')) {
    return true
  }

  if (argv.some((arg) => arg === '--no-database-update' || arg === '--no-db-update' || arg === '--no-db')) {
    return false
  }

  const valueArg = argv.find((arg) => arg.startsWith('--database-update='))
  const value = valueArg?.split('=').slice(1).join('=').trim().toLowerCase()
  if (value === 'yes' || value === 'true' || value === '1') return true
  if (value === 'no' || value === 'false' || value === '0') return false

  return 'auto'
}

function resolveDatabaseUpdate(rootDir, requested) {
  if (requested === true || requested === false) {
    return {
      hasUpdate: requested,
      mode: 'manual',
      files: [],
    }
  }

  const files = changedFiles(rootDir).filter(isDatabaseUpdateFile)
  return {
    hasUpdate: files.length > 0,
    mode: 'auto',
    files,
  }
}

function changedFiles(rootDir) {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD', '--'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return output.split(/\r?\n/).map((file) => file.trim()).filter(Boolean)
  } catch {
    return []
  }
}

function isDatabaseUpdateFile(file) {
  const normalized = file.replaceAll('\\', '/').toLowerCase()
  const fileName = normalized.split('/').pop() ?? ''
  return normalized.includes('/migrations/')
    || normalized.includes('/migration-manager/')
    || normalized.includes('/tenant-database/')
    || normalized.includes('/infrastructure/database/')
    || normalized.includes('/database/')
    || fileName === 'schema.ts'
    || fileName.endsWith('.schema.ts')
    || fileName.endsWith('.migration.ts')
    || fileName === 'migration.ts'
    || fileName.endsWith('.database.ts')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const argv = process.argv.slice(2)
  const result = bumpNextVersion(resolve(import.meta.dirname, '../..'), parseTitleArg(argv), {
    databaseUpdate: parseDatabaseUpdateArg(argv),
  })
  console.log(`Bumped ${result.currentVersion} -> ${result.nextVersion}`)
  console.log(`Database update: ${result.databaseUpdate.hasUpdate ? 'yes' : 'no'} (${result.databaseUpdate.mode})`)
}
