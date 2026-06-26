import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readJson(file) {
  return JSON.parse(readFileSync(path.join(root, file), 'utf8'))
}

function readText(file) {
  return readFileSync(path.join(root, file), 'utf8')
}

function gitChangedFiles() {
  try {
    const output = execFileSync('git', ['diff', '--name-only', 'HEAD'], { cwd: root, encoding: 'utf8' })
    return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((file) => file.replaceAll('\\', '/'))
  } catch {
    return []
  }
}

function fail(message) {
  failures.push(message)
}

function section(text, heading) {
  const start = text.indexOf(heading)
  if (start === -1) return ''
  const next = text.indexOf('\n## ', start + heading.length)
  return next === -1 ? text.slice(start) : text.slice(start, next)
}

const failures = []
const rootPackage = readJson('package.json')
const changelog = readText('assist/documentation/CHANGELOG.md')
const currentVersion = rootPackage.version
const currentVersionHeading = `## v-${currentVersion}`
const currentSection = section(changelog, currentVersionHeading)

if (!changelog.includes(`- **Current version:** \`${currentVersion}\``)) {
  fail(`CHANGELOG Version State must match package.json version ${currentVersion}.`)
}

if (!changelog.includes(`- **Release tag:** \`v-${currentVersion}\``)) {
  fail(`CHANGELOG Release tag must be v-${currentVersion}.`)
}

if (!changelog.includes(`- **Changelog label:** \`v ${currentVersion}\``)) {
  fail(`CHANGELOG label must be v ${currentVersion}.`)
}

if (!currentSection) {
  fail(`CHANGELOG must contain a current section ${currentVersionHeading}.`)
} else {
  if (!currentSection.includes('#### Database Changes')) fail(`${currentVersionHeading} must include Database Changes.`)
  if (!currentSection.includes('#### App Codebase Changes')) fail(`${currentVersionHeading} must include App Codebase Changes.`)
}

for (const workspace of ['apps/platform-api', 'apps/billing-api', 'apps/ecommerce-api']) {
  const packageFile = `${workspace}/package.json`
  if (!existsSync(path.join(root, packageFile))) continue
  const packageJson = readJson(packageFile)
  if (packageJson.version !== currentVersion) {
    fail(`${packageFile} version ${packageJson.version} must match root package version ${currentVersion}.`)
  }
}

const changed = gitChangedFiles()
const changedMeaningful = changed.filter((file) => (
  !file.startsWith('node_modules/')
  && !file.includes('/dist/')
  && !file.endsWith('package-lock.json')
  && file !== 'assist/documentation/CHANGELOG.md'
))

const codeOrRuleChanged = changedMeaningful.some((file) => (
  file.startsWith('apps/')
  || file.startsWith('packages/')
  || file.startsWith('assist/rules/')
  || file.startsWith('assist/context/')
  || file.startsWith('assist/execution/')
  || file.startsWith('assist/scripts/')
))

if (codeOrRuleChanged && !changed.includes('assist/documentation/CHANGELOG.md')) {
  fail('Meaningful code/rule/context changes must update assist/documentation/CHANGELOG.md in the same stage.')
}

const platformModuleChanges = changed.filter((file) => file.startsWith('apps/platform-api/src/modules/') && file.endsWith('.ts'))
const modules = new Set(platformModuleChanges.map((file) => file.split('/').slice(0, 5).join('/')))

for (const moduleDir of modules) {
  const moduleName = moduleDir.split('/').at(-1)
  const moduleDoc = `${moduleDir}/${moduleName}.module.md`
  if (!existsSync(path.join(root, moduleDoc))) {
    fail(`Platform API module ${moduleName} must include local documentation: ${moduleDoc}.`)
  }
}

if (failures.length > 0) {
  console.error('Documentation/changelog policy check failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`Documentation/changelog policy ok for ${currentVersion}.`)
