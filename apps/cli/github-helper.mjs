#!/usr/bin/env node

import { execFileSync, execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

const ROOT = resolve(import.meta.dirname, '../..')
const today = () => new Date().toISOString().slice(0, 10)

function run(cmd, opts = {}) {
  const stdio = opts.silent ? 'pipe' : 'inherit'
  const result = execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio,
    ...opts,
  })
  return result ? result.trim() : ''
}

function runGit(args, opts = {}) {
  const stdio = opts.silent ? 'pipe' : 'inherit'
  const result = execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio,
    ...opts,
  })
  return result ? result.trim() : ''
}

let cachedPipedAnswers

async function pipedAnswers() {
  if (cachedPipedAnswers) {
    return cachedPipedAnswers
  }

  if (process.stdin.isTTY) {
    cachedPipedAnswers = []
    return cachedPipedAnswers
  }

  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  cachedPipedAnswers = Buffer.concat(chunks).toString().trim().split('\n')
  return cachedPipedAnswers
}

async function ask(query) {
  process.stdout.write(query)

  const answers = await pipedAnswers()
  if (answers.length > 0) {
    return answers.shift()
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolveAnswer) => {
    rl.question('', (answer) => {
      rl.close()
      resolveAnswer(answer)
    })
  })
}

function readPackageVersion() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
  return pkg.version
}

function bumpPatch(version) {
  const parts = version.split('.')
  parts[2] = String(Number(parts[2] || 0) + 1).padStart(2, '0')
  return parts.join('.')
}

function getRef(version) {
  return String(Number(version.split('.')[2] || 0)).padStart(2, '0')
}

function getChangelogTitle() {
  const path = resolve(ROOT, 'assist/documentation/CHANGELOG.md')
  const text = readFileSync(path, 'utf8')
  const match = text.match(/### \[v [\d.]+\] \d{4}-\d{2}-\d{2} - (.+)/)
  return match ? match[1] : 'update'
}

function bumpAllVersionRefs(newVer) {
  const targets = [
    'package.json',
    'package-lock.json',
    'apps/cli/package.json',
    'apps/server/package.json',
    'apps/frontend/package.json',
    'apps/frontend/index.html',
    'apps/web/package.json',
    'packages/shared/package.json',
    'packages/ui/package.json',
    'packages/web/package.json',
    'packages/desktop/package.json',
    'packages/mobile/package.json',
    'README.md',
    'assist/README.md',
    'assist/documentation/CHANGELOG.md',
    'assist/templates/commit.md',
  ].map((path) => resolve(ROOT, path))

  const versionPattern = /1\.0\.\d{2,}/g
  const newPatch = Number(newVer.split('.')[2] || 0)
  let updated = 0

  for (const file of targets) {
    if (!existsSync(file)) {
      continue
    }

    let content = readFileSync(file, 'utf8')
    const matches = content.match(versionPattern)

    if (!matches) {
      continue
    }

    for (const version of new Set(matches)) {
      const patch = Number(version.split('.')[2] || 0)
      if (patch < newPatch) {
        content = content.split(version).join(newVer)
      }
    }

    if (content !== readFileSync(file, 'utf8')) {
      writeFileSync(file, content, 'utf8')
      updated++
    }
  }

  return updated
}

function addChangelogEntry(version, title) {
  const path = resolve(ROOT, 'assist/documentation/CHANGELOG.md')
  let content = readFileSync(path, 'utf8')

  content = content.replace(
    /- \*\*Current version:\*\* `[\d.]+`/,
    `- **Current version:** \`${version}\``,
  )
  content = content.replace(
    /- \*\*Release tag:\*\* `v-[\d.]+`/,
    `- **Release tag:** \`v-${version}\``,
  )
  content = content.replace(
    /- \*\*Changelog label:\*\* `v [\d.]+`/,
    `- **Changelog label:** \`v ${version}\``,
  )

  const marker = '\n---\n\n'
  const entry = `## v-${version}\n\n### [v ${version}] ${today()} - ${title}\n\n`
  content = content.replace(marker, marker + entry)

  writeFileSync(path, content, 'utf8')
}

async function main() {
  const oldVer = readPackageVersion()
  const newVer = bumpPatch(oldVer)
  const ref = getRef(newVer)
  const prevTitle = getChangelogTitle()

  const status = run('git status --porcelain', { silent: true })
  const files = status ? status.split('\n').filter(Boolean) : []

  console.log(`\n  Current version: ${oldVer}`)
  console.log(`  Next version:    ${newVer}`)
  console.log(`  Uncommitted:     ${files.length} files\n`)

  if (files.length > 0) {
    files.forEach((file) => console.log(`    ${file}`))
    console.log('')
  }

  const bumpAnswer = await ask(`  Bump to ${newVer}? [Y/n]: `)
  if (bumpAnswer.trim().toLowerCase() === 'n') {
    console.log('\n  Cancelled.\n')
    return
  }

  const defaultMessage = `#${ref} ${prevTitle}`
  const messageAnswer = await ask(`  Commit message [${defaultMessage}]: `)
  const message = messageAnswer.trim() || defaultMessage
  const changelogTitle = message.replace(/^#\S+\s+/, '')

  console.log('\n  > git pull --rebase --autostash')
  runGit(['pull', '--rebase', '--autostash'])
  console.log('')

  const updated = bumpAllVersionRefs(newVer)
  console.log(`  Updated ${updated} files from ${oldVer} -> ${newVer}`)

  addChangelogEntry(newVer, changelogTitle)
  console.log(`  Added CHANGELOG entry for v${newVer}`)

  console.log('  > git add -A')
  runGit(['add', '-A'])

  console.log(`  > git commit -m "${message}"`)
  runGit(['commit', '-m', message])

  console.log('  > git push')
  runGit(['push'])

  console.log(`\n  Done - ${message}\n`)
}

main().catch((error) => {
  console.error(`\n  Error: ${error.message}\n`)
  process.exit(1)
})

