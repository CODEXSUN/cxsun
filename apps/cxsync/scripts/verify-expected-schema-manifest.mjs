import { access, readFile } from "node:fs/promises"
import { resolve } from "node:path"

const path = resolve(import.meta.dirname, "../electron/resources/expected-schema-manifest.json")
await access(path).catch(() => { throw new Error("Expected-schema manifest is missing. Run npm -w apps/cxsync run generate:expected-schema.") })
const manifest = JSON.parse(await readFile(path, "utf8"))
if (manifest.formatVersion !== 1 || !manifest.schemaHash || !manifest.sourceHash || !manifest.inspection?.tables?.length) {
  throw new Error("Expected-schema manifest is invalid. Regenerate it before building CXSync.")
}
process.stdout.write(`Expected-schema manifest ready: ${manifest.inspection.totals.tableCount} tables, ${manifest.schemaHash.slice(0, 12)}\n`)
