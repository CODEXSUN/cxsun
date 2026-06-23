import { createHash } from "node:crypto"
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import mysql from "mysql2/promise"

const workspaceRoot = resolve(import.meta.dirname, "../../..")
const env = parseEnv(await readFile(resolve(workspaceRoot, ".env"), "utf8"))
const connection = await mysql.createConnection({
  database: env.CXSYNC_DB_NAME || "cxsync_admin",
  host: env.CXSYNC_DB_HOST || env.DB_HOST || "127.0.0.1",
  password: env.CXSYNC_DB_PASSWORD || env.DB_PASSWORD || "",
  port: Number(env.CXSYNC_DB_PORT || env.DB_PORT || 3306),
  user: env.CXSYNC_DB_USER || env.DB_USER || "root",
})

try {
  const [rows] = await connection.execute(
    "SELECT manifest_json FROM cxsync_schema_baselines WHERE source = 'codebase' ORDER BY created_at DESC LIMIT 1",
  )
  if (!rows[0]) throw new Error("No codebase expected-schema baseline exists in cxsync_admin. Capture it once from the development workspace first.")
  const stored = JSON.parse(rows[0].manifest_json)
  const sourceHash = String(stored.codebaseSourceHash || "").trim()
  if (!sourceHash) throw new Error("The latest codebase baseline has no source hash. Rebuild it before exporting the packaged manifest.")
  const currentSourceHash = await codebaseSchemaSourceHash(resolve(workspaceRoot, "apps/server/src"))
  if (currentSourceHash !== sourceHash) throw new Error("The stored expected schema is stale because tenant migration sources changed. Rebuild the development baseline before exporting the release manifest.")
  const inspection = { ...stored }
  delete inspection.codebaseSourceHash
  const schemaHash = hashInspection(inspection)
  const output = resolve(workspaceRoot, "apps/cxsync/electron/resources/expected-schema-manifest.json")
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify({ formatVersion: 1, generatedAt: new Date().toISOString(), inspection, schemaHash, sourceHash }, null, 2)}\n`, "utf8")
  process.stdout.write(`Expected-schema manifest written: ${inspection.totals.tableCount} tables, ${schemaHash.slice(0, 12)}\n`)
} finally {
  await connection.end()
}

function parseEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
    const separator = line.indexOf("=")
    return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")]
  }))
}

function hashInspection(inspection) {
  return createHash("sha256").update(JSON.stringify({
    columns: inspection.columns,
    indexes: inspection.indexes,
    tables: inspection.tables.map(({ dataLength, indexLength, rowsEstimate, updatedAt, ...table }) => table),
  })).digest("hex")
}

async function codebaseSchemaSourceHash(serverSource) {
  const files = [
    resolve(serverSource, "infrastructure/tenant-database/tenant-database.connection.ts"),
    resolve(serverSource, "infrastructure/tenant-database/build-scratch-schema.ts"),
    ...await migrationSourceFiles(resolve(serverSource, "modules")),
  ].sort()
  const hash = createHash("sha256")
  for (const file of files) {
    hash.update(file)
    hash.update("\0")
    hash.update(await readFile(file))
    hash.update("\0")
  }
  return hash.digest("hex")
}

async function migrationSourceFiles(root) {
  const results = []
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile() && /\.ts$/.test(entry.name) && /migration|migrations|database/.test(path.replaceAll("\\", "/"))) results.push(path)
    }
  }
  await visit(root)
  return results
}
