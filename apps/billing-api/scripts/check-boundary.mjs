import { readdir, readFile } from 'node:fs/promises'
import { extname, relative } from 'node:path'

const billingRoot = new URL('..', import.meta.url)
const blockedPatterns = [`@cxsun/${'server'}`, `${'server'}/src`]
const scannedExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.json'])
const ignoredDirectories = new Set(['dist', 'node_modules'])
const violations = []

async function scan(directoryUrl) {
  for (const entry of await readdir(directoryUrl, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue

    const entryUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl)
    if (entry.isDirectory()) {
      await scan(entryUrl)
      continue
    }

    if (!scannedExtensions.has(extname(entry.name))) continue

    const content = await readFile(entryUrl, 'utf8')
    for (const pattern of blockedPatterns) {
      if (content.includes(pattern)) {
        violations.push(`${relative(billingRoot.pathname, entryUrl.pathname)} contains ${pattern}`)
      }
    }
  }
}

await scan(billingRoot)

if (violations.length > 0) {
  console.error('Billing API boundary check failed:')
  for (const violation of violations) console.error(`- ${violation}`)
  process.exit(1)
}

console.log('Billing API boundary ok: no apps/server source or package dependencies.')
