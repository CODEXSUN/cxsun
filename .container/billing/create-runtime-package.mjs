import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const [outputDirectory, ...manifestPaths] = process.argv.slice(2)

if (!outputDirectory || manifestPaths.length === 0) {
  throw new Error('Usage: node create-runtime-package.mjs <output-directory> <package-json>...')
}

const dependencies = {}

for (const manifestPath of manifestPaths) {
  const manifest = JSON.parse(readFileSync(resolve(manifestPath), 'utf8'))
  Object.assign(dependencies, manifest.dependencies ?? {})
}

for (const dependencyName of Object.keys(dependencies)) {
  if (dependencyName.startsWith('@cxsun/')) {
    delete dependencies[dependencyName]
  }
}

mkdirSync(outputDirectory, { recursive: true })
writeFileSync(
  resolve(outputDirectory, 'package.json'),
  `${JSON.stringify({
    name: 'cxsun-billing-runtime',
    private: true,
    type: 'module',
    dependencies,
  }, null, 2)}\n`,
)
