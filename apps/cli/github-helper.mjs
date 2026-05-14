#!/usr/bin/env node

import { execSync } from 'child_process'
import { createInterface } from 'readline'
import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '../..')
const today = () => new Date().toISOString().slice(0, 10)

function run(cmd, opts = {}) {
  const stdio = opts.silent ? 'pipe' : 'inherit'
  const result = execSync(cmd, {
    encoding: 'utf8',
    cwd: ROOT,
    stdio,
    ...opts,
  })
  return result ? result.trim() : ''
}

// Read all piped stdin upfront when non-interactive
let _pipedAnswers
async function pipedAnswers() {
  if (_pipedAnswers) return _pipedAnswers
  if (process.stdin.isTTY) return (_pipedAnswers = [])
  const chunks = []
  for await (const chunk of process.stdin) chunks.push(chunk)
  _pipedAnswers = Buffer.concat(chunks).toString().trim().split('\n')
  return _pipedAnswers
}

async function ask(query) {
  process.stdout.write(query)
  const answers = await pipedAnswers()
  if (answers.length > 0) return answers.shift()
  // Interactive fallback
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question('', (a) => { rl.close(); resolve(a) }))
}

function getCurrentVersion() {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8'))
  return pkg.version
}

function bumpPatch(version) {
  const parts = version.split('.')
  const patch = (Number(parts[2] || 0) + 1)
  parts[2] = String(patch).padStart(2, '0')
  return parts.join('.')
}

function getRef(version) {
  return String(Number(version.split('.')[2] || 0)).padStart(2, '0')
}

function getChangelogTitle() {
  const path = resolve(ROOT, 'assist/documentation/CHANGELOG.md')
  const text = readFileSync(path, 'utf8')
  const match = text.match(
    /### \[v [\d.]+\] \d{4}-\d{2}-\d{2} - (.+)/,
  )
  return match ? match[1] : 'update'
}

function bumpAllVersionRefs(oldVer, newVer) {
  const targets = [
    resolve(ROOT, 'package.json'),
    resolve(ROOT, 'apps/cli/package.json'),
    resolve(ROOT, 'apps/server/package.json'),
    resolve(ROOT, 'apps/frontend/package.json'),
    resolve(ROOT, 'apps/frontend/index.html'),
    resolve(ROOT, 'packages/shared/package.json'),
    resolve(ROOT, 'packages/web/package.json'),
    resolve(ROOT, 'packages/desktop/package.json'),
    resolve(ROOT, 'packages/mobile/package.json'),
    resolve(ROOT, 'README.md'),
    resolve(ROOT, 'assist/README.md'),
    resolve(ROOT, 'assist/documentation/CHANGELOG.md'),
    resolve(ROOT, 'assist/templates/commit.md'),
  ]

  const versionPattern = new RegExp(`1\\.0\\.\\d{2,}`, 'g')

  let updated = 0
  for (const file of targets) {
    let content = readFileSync(file, 'utf8')
    const matches = content.match(versionPattern)
    if (matches) {
      const unique = [...new Set(matches)]
      for (const v of unique) {
        const vNum = parseInt(v.split('.')[2], 10)
        const newNum = parseInt(newVer.split('.')[2], 10)
        if (vNum < newNum) {
          content = content.split(v).join(newVer)
        }
      }
      if (matches.some(m => m !== newVer)) {
        writeFileSync(file, content, 'utf8')
        updated++
      }
    }
  }
  return updated
}

function addChangelogEntry(version, title) {
  const path = resolve(ROOT, 'assist/documentation/CHANGELOG.md')
  let content = readFileSync(path, 'utf8')

  // Update Version State block
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

  // Insert new version section after the Version State block
  const marker = '\n---\n\n'
  const entry = `## v-${version}\n\n### [v ${version}] ${today()} - ${title}\n\n`
  content = content.replace(marker, marker + entry)

  writeFileSync(path, content, 'utf8')
}

async function main() {
  // ---- Discover current state ----
  const oldVer = getCurrentVersion()
  const newVer = bumpPatch(oldVer)
  const ref = getRef(newVer)
  const prevTitle = getChangelogTitle()

  // ---- Show status ----
  const status = run('git status --porcelain', { silent: true })
  const files = status ? status.split('\n').filter(Boolean) : []

  console.log(`\n  Current version: ${oldVer}`)
  console.log(`  Next version:    ${newVer}`)
  console.log(`  Uncommitted:     ${files.length} files\n`)

  if (files.length > 0) {
    files.forEach((f) => console.log(`    ${f}`))
    console.log('')
  }

  // ---- Bump confirmation ----
  const bumpAns = await ask(`  Bump to ${newVer}? [Y/n]: `)
  const doBump = bumpAns.trim().toLowerCase() !== 'n'

  if (!doBump) {
    console.log('\n  Cancelled.\n')
    return
  }

  // ---- Commit message ----
  const defaultMsg = `#${ref} ${prevTitle}`
  const msgAns = await ask(`  Commit message [${defaultMsg}]: `)
  const msg = msgAns.trim() || defaultMsg

  // Extract title from message for changelog
  const titleFromMsg = msg.replace(/^#\S+\s+/, '')
  console.log('')

  // ---- Bump versions in all files ----
  const n = bumpAllVersionRefs(oldVer, newVer)
  console.log(`  ✓ Updated ${n} files from ${oldVer} → ${newVer}`)

  // ---- Add changelog entry ----
  addChangelogEntry(newVer, titleFromMsg)
  console.log(`  ✓ Added CHANGELOG entry for v${newVer}`)

  // ---- Git pull ----
  try {
    console.log('  » git pull --rebase')
    run('git pull --rebase')
    console.log('')
  } catch {
    console.log('  ⚠ pull skipped (will push anyway)\n')
  }

  // ---- Commit & push ----
  console.log('  » git add -A')
  run('git add -A')

  console.log(`  » git commit -m "${msg}"`)
  run(`git commit -m "${msg.replace(/"/g, '\\"')}"`)

  console.log('  » git push')
  run('git push')

  console.log(`\n  ✓ Done — ${msg}\n`)
}

main().catch((e) => {
  console.error(`\n  ✗ ${e.message}\n`)
  process.exit(1)
})
