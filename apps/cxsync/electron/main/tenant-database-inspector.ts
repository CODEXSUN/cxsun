import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import { createHash, randomUUID } from "node:crypto"
import { spawn } from "node:child_process"
import { readdir, readFile, stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { app } from "electron"
import type {
  TenantColumnInspectionItem,
  TenantDatabaseInspection,
  TenantIndexInspectionItem,
  TenantSchemaBaseline,
  TenantSchemaBuildStatus,
  TenantSchemaDiffItem,
  TenantSchemaDiffResult,
} from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { loadCxSyncEnvironment } from "./environment.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"

type TableRow = RowDataPacket & {
  TABLE_COLLATION: string | null
  TABLE_NAME: string
  TABLE_ROWS: number | null
  DATA_LENGTH: number | null
  ENGINE: string | null
  INDEX_LENGTH: number | null
  UPDATE_TIME: Date | string | null
}

type ColumnRow = RowDataPacket & {
  COLUMN_DEFAULT: string | null
  COLUMN_NAME: string
  COLUMN_TYPE: string
  EXTRA: string
  IS_NULLABLE: "YES" | "NO"
  ORDINAL_POSITION: number
  TABLE_NAME: string
}

type IndexRow = RowDataPacket & {
  COLUMN_NAME: string
  INDEX_NAME: string
  NON_UNIQUE: number
  SEQ_IN_INDEX: number
  TABLE_NAME: string
}

type BaselineRow = RowDataPacket & {
  baseline_name: string
  created_at: string
  id: string
  manifest_json: string
  schema_hash: string
  source: "local-inspection" | "codebase" | "cloud"
}

type CodebaseBaselineManifest = TenantDatabaseInspection & {
  codebaseSourceHash?: string
}

type PackagedExpectedSchemaManifest = {
  formatVersion: 1
  generatedAt: string
  inspection: TenantDatabaseInspection
  schemaHash: string
  sourceHash: string
}

type ScratchProgress = {
  operation: string | null
  processState: string | null
  recentTables: string[]
  tableCount: number
}

const schemaBuildStatuses = new Map<string, TenantSchemaBuildStatus>()

// Legacy development builders remain temporarily for manifest regeneration compatibility.
// Desktop runtime baseline capture uses readPackagedExpectedSchemaManifest exclusively.
void buildExpectedSchema
void codebaseSchemaSourceHash

export async function inspectTenantDatabase(id: string): Promise<TenantDatabaseInspection> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")

  const inspection = await inspectDatabase({
    database: tenant.localDatabase,
    host: tenant.localHost,
    password: tenant.localPassword,
    port: tenant.localPort,
    user: tenant.localUser,
  })
  await saveInspectionSnapshot(id, inspection)
  return inspection
}

async function inspectDatabase(config: {
  database: string
  host: string
  password: string
  port: number
  user: string
}): Promise<TenantDatabaseInspection> {

  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      connectTimeout: 8_000,
      ...config,
    })
    const [rows] = await connection.execute<TableRow[]>(
      `SELECT TABLE_NAME, ENGINE, TABLE_ROWS, DATA_LENGTH, INDEX_LENGTH, UPDATE_TIME, TABLE_COLLATION
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME`,
      [config.database],
    )
    const [columnRows] = await connection.execute<ColumnRow[]>(
      `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, ORDINAL_POSITION`,
      [config.database],
    )
    const [indexRows] = await connection.execute<IndexRow[]>(
      `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = ?
       ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
      [config.database],
    )
    const capturedAt = new Date().toISOString()
    const columns = toColumns(columnRows)
    const indexes = toIndexes(indexRows)
    const tableStats = summarizeSchema(columns, indexes)
    const tables = rows.map((row) => ({
      collation: row.TABLE_COLLATION ?? "",
      columnCount: tableStats.get(row.TABLE_NAME)?.columnCount ?? 0,
      dataLength: Number(row.DATA_LENGTH ?? 0),
      engine: row.ENGINE ?? "",
      hasPrimaryKey: tableStats.get(row.TABLE_NAME)?.hasPrimaryKey ?? false,
      indexCount: tableStats.get(row.TABLE_NAME)?.indexCount ?? 0,
      indexLength: Number(row.INDEX_LENGTH ?? 0),
      rowsEstimate: Number(row.TABLE_ROWS ?? 0),
      tableName: row.TABLE_NAME,
      updatedAt: row.UPDATE_TIME ? isoDate(row.UPDATE_TIME) : null,
    }))
    const inspection: TenantDatabaseInspection = {
      capturedAt,
      columns,
      database: config.database,
      indexes,
      snapshotId: randomUUID(),
      tables,
      totals: {
        columnCount: columns.length,
        dataLength: tables.reduce((sum, table) => sum + table.dataLength, 0),
        indexCount: new Set(indexes.map((index) => `${index.tableName}.${index.indexName}`)).size,
        indexLength: tables.reduce((sum, table) => sum + table.indexLength, 0),
        missingPrimaryKeyCount: tables.filter((table) => !table.hasPrimaryKey).length,
        rowsEstimate: tables.reduce((sum, table) => sum + table.rowsEstimate, 0),
        tableCount: tables.length,
      },
    }
    return inspection
  } finally {
    await connection?.end().catch(() => undefined)
  }
}

export async function captureTenantSchemaBaseline(id: string): Promise<TenantSchemaBaseline> {
  const inspection = await inspectTenantDatabase(id)
  const database = await getCxSyncDatabase()
  const baselineId = randomUUID()
  const capturedAt = sqlDate(new Date(inspection.capturedAt))
  const schemaHash = hashInspection(inspection)
  await database.execute("UPDATE cxsync_schema_baselines SET is_active = 0, updated_at = ? WHERE tenant_connection_id = ?", [capturedAt, id])
  await database.execute(
    `INSERT INTO cxsync_schema_baselines
      (id, tenant_connection_id, baseline_name, source, schema_hash, manifest_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'local-inspection', ?, ?, 1, ?, ?)`,
    [
      baselineId,
      id,
      `Local baseline ${new Date(inspection.capturedAt).toLocaleString("en-IN")}`,
      schemaHash,
      JSON.stringify(inspection),
      capturedAt,
      capturedAt,
    ],
  )
  return {
    baselineName: `Local baseline ${new Date(inspection.capturedAt).toLocaleString("en-IN")}`,
    capturedAt: inspection.capturedAt,
    id: baselineId,
    schemaHash,
    source: "local-inspection",
    totals: inspection.totals,
  }
}

export async function captureCodebaseSchemaBaseline(id: string): Promise<TenantSchemaBaseline> {
  const packaged = await readPackagedExpectedSchemaManifest()
  const sourceHash = packaged.sourceHash
  updateBuildStatus(id, {
    activity: [`Loaded packaged expected schema ${packaged.schemaHash.slice(0, 12)}.`],
    database: null,
    error: null,
    message: `Loaded packaged expected schema with ${packaged.inspection.totals.tableCount} tables.`,
    operation: "Loading packaged manifest",
    phase: "completed",
    processState: null,
    recentOutput: null,
    recentTables: [],
    startedAt: new Date().toISOString(),
    tableCount: packaged.inspection.totals.tableCount,
  })
  const database = await getCxSyncDatabase()
  const cached = await latestCodebaseBaselineForSource(id, sourceHash, packaged.schemaHash)
  if (cached) {
    const now = sqlDate(new Date())
    await database.execute("UPDATE cxsync_schema_baselines SET is_active = 0, updated_at = ? WHERE tenant_connection_id = ?", [now, id])
    await database.execute("UPDATE cxsync_schema_baselines SET is_active = 1, updated_at = ? WHERE id = ?", [now, cached.id])
    const baseline = toBaseline(cached)
    updateBuildStatus(id, {
      activity: [`Reused cached expected schema ${cached.id.slice(0, 8)} because migration files are unchanged.`],
      database: null,
      error: null,
      message: `Reused cached expected schema with ${baseline.totals.tableCount} tables.`,
      operation: "Using cached codebase baseline",
      phase: "completed",
      processState: null,
      recentOutput: null,
      recentTables: [],
      startedAt: new Date().toISOString(),
      tableCount: baseline.totals.tableCount,
    })
    return baseline
  }

  const inspection = { ...packaged.inspection, capturedAt: packaged.generatedAt, snapshotId: randomUUID() }
  const baselineId = randomUUID()
  const capturedAt = sqlDate(new Date(inspection.capturedAt))
  const schemaHash = hashInspection(inspection)
  await database.execute("UPDATE cxsync_schema_baselines SET is_active = 0, updated_at = ? WHERE tenant_connection_id = ?", [capturedAt, id])
  await database.execute(
    `INSERT INTO cxsync_schema_baselines
      (id, tenant_connection_id, baseline_name, source, schema_hash, manifest_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 'codebase', ?, ?, 1, ?, ?)`,
    [
      baselineId,
      id,
      `Packaged expected schema ${new Date(inspection.capturedAt).toLocaleString("en-IN")}`,
      schemaHash,
      JSON.stringify({ ...inspection, codebaseSourceHash: sourceHash } satisfies CodebaseBaselineManifest),
      capturedAt,
      capturedAt,
    ],
  )
  return {
    baselineName: `Packaged expected schema ${new Date(inspection.capturedAt).toLocaleString("en-IN")}`,
    capturedAt: inspection.capturedAt,
    id: baselineId,
    schemaHash,
    source: "codebase",
    totals: inspection.totals,
  }
}

async function readPackagedExpectedSchemaManifest(): Promise<PackagedExpectedSchemaManifest> {
  const start = dirname(fileURLToPath(import.meta.url))
  const candidates = app.isPackaged
    ? [resolve(process.resourcesPath, "expected-schema", "expected-schema-manifest.json")]
    : [
        resolve(process.cwd(), "electron/resources/expected-schema-manifest.json"),
        resolve(process.cwd(), "apps/cxsync/electron/resources/expected-schema-manifest.json"),
        resolve(start, "../../resources/expected-schema-manifest.json"),
        resolve(start, "../../../electron/resources/expected-schema-manifest.json"),
      ]
  for (const path of candidates) {
    try {
      const parsed = JSON.parse(await readFile(path, "utf8")) as PackagedExpectedSchemaManifest
      if (parsed.formatVersion !== 1 || !parsed.inspection?.tables || !parsed.schemaHash || !parsed.sourceHash) throw new Error("Manifest format is invalid.")
      if (hashInspection(parsed.inspection) !== parsed.schemaHash) throw new Error("Manifest schema hash does not match its contents.")
      return parsed
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && error.message.includes("Manifest"))) throw error
    }
  }
  throw new Error("Packaged expected-schema manifest was not found. Run npm -w apps/cxsync run generate:expected-schema before building CXSync.")
}

export async function getCodebaseSchemaBuildStatus(id: string): Promise<TenantSchemaBuildStatus> {
  return schemaBuildStatuses.get(id) ?? idleBuildStatus()
}

export async function getTenantSchemaBaseline(id: string): Promise<TenantSchemaBaseline | null> {
  const row = await latestBaselineRow(id)
  return row ? toBaseline(row) : null
}

export async function compareTenantSchema(id: string): Promise<TenantSchemaDiffResult> {
  const row = await latestBaselineRow(id)
  if (!row) {
    return emptyDiffResult(await inspectTenantDatabase(id))
  }
  const baselineInspection = JSON.parse(row.manifest_json) as TenantDatabaseInspection
  const currentInspection = await inspectTenantDatabase(id)
  const items = diffInspections(baselineInspection, currentInspection)
  const result: TenantSchemaDiffResult = {
    baseline: toBaseline(row),
    comparedAt: new Date().toISOString(),
    currentSnapshotId: currentInspection.snapshotId,
    diffSnapshotId: randomUUID(),
    items,
    summary: summarizeDiff(items),
  }
  await saveDiffSnapshot(id, result)
  return result
}

async function saveInspectionSnapshot(id: string, inspection: TenantDatabaseInspection) {
  const database = await getCxSyncDatabase()
  const capturedAt = sqlDate(new Date(inspection.capturedAt))
  await database.execute(
    `INSERT INTO cxsync_data_snapshots
      (id, tenant_connection_id, snapshot_type, source_version, status, row_count, size_bytes, manifest_json, created_at, updated_at)
     VALUES (?, ?, 'local_table_inspection', NULL, 'captured', ?, ?, ?, ?, ?)`,
    [
      inspection.snapshotId,
      id,
      inspection.totals.rowsEstimate,
      inspection.totals.dataLength + inspection.totals.indexLength,
      JSON.stringify({ columns: inspection.columns, database: inspection.database, indexes: inspection.indexes, tables: inspection.tables, totals: inspection.totals }),
      capturedAt,
      capturedAt,
    ],
  )
  await database.execute(
    `INSERT INTO cxsync_analytics_snapshots
      (tenant_connection_id, metric_key, metric_value, payload_json, captured_at)
     VALUES
      (?, 'inspection.table_count', ?, ?, ?),
      (?, 'inspection.rows_estimate', ?, ?, ?),
      (?, 'inspection.size_bytes', ?, ?, ?),
      (?, 'inspection.column_count', ?, ?, ?),
      (?, 'inspection.index_count', ?, ?, ?),
      (?, 'inspection.missing_primary_key_count', ?, ?, ?)`,
    [
      id, inspection.totals.tableCount, JSON.stringify({ snapshotId: inspection.snapshotId }), capturedAt,
      id, inspection.totals.rowsEstimate, JSON.stringify({ snapshotId: inspection.snapshotId }), capturedAt,
      id, inspection.totals.dataLength + inspection.totals.indexLength, JSON.stringify({ snapshotId: inspection.snapshotId }), capturedAt,
      id, inspection.totals.columnCount, JSON.stringify({ snapshotId: inspection.snapshotId }), capturedAt,
      id, inspection.totals.indexCount, JSON.stringify({ snapshotId: inspection.snapshotId }), capturedAt,
      id, inspection.totals.missingPrimaryKeyCount, JSON.stringify({ snapshotId: inspection.snapshotId }), capturedAt,
    ],
  )
}

async function latestBaselineRow(id: string) {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<BaselineRow[]>(
    `SELECT id, baseline_name, source, schema_hash, manifest_json, created_at
     FROM cxsync_schema_baselines
     WHERE tenant_connection_id = ? AND is_active = 1
     ORDER BY created_at DESC
     LIMIT 1`,
    [id],
  )
  return rows[0] ?? null
}

async function latestCodebaseBaselineForSource(id: string, sourceHash: string, schemaHash: string) {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<BaselineRow[]>(
    `SELECT id, baseline_name, source, schema_hash, manifest_json, created_at
     FROM cxsync_schema_baselines
     WHERE tenant_connection_id = ? AND source = 'codebase'
     ORDER BY created_at DESC
     LIMIT 10`,
    [id],
  )
  return rows.find((row) => {
    try {
      return row.schema_hash === schemaHash && (JSON.parse(row.manifest_json) as CodebaseBaselineManifest).codebaseSourceHash === sourceHash
    } catch {
      return false
    }
  }) ?? null
}

async function saveDiffSnapshot(id: string, result: TenantSchemaDiffResult) {
  const database = await getCxSyncDatabase()
  const comparedAt = sqlDate(new Date(result.comparedAt))
  await database.execute(
    `INSERT INTO cxsync_data_snapshots
      (id, tenant_connection_id, snapshot_type, source_version, status, row_count, size_bytes, manifest_json, created_at, updated_at)
     VALUES (?, ?, 'schema_diff', ?, ?, ?, 0, ?, ?, ?)`,
    [
      result.diffSnapshotId,
      id,
      result.baseline?.schemaHash ?? null,
      result.summary.critical ? "critical" : result.summary.total ? "differences" : "clean",
      result.summary.total,
      JSON.stringify(result),
      comparedAt,
      comparedAt,
    ],
  )
  await database.execute(
    `INSERT INTO cxsync_analytics_snapshots
      (tenant_connection_id, metric_key, metric_value, payload_json, captured_at)
     VALUES
      (?, 'schema_diff.total', ?, ?, ?),
      (?, 'schema_diff.critical', ?, ?, ?),
      (?, 'schema_diff.warning', ?, ?, ?)`,
    [
      id, result.summary.total, JSON.stringify({ snapshotId: result.diffSnapshotId }), comparedAt,
      id, result.summary.critical, JSON.stringify({ snapshotId: result.diffSnapshotId }), comparedAt,
      id, result.summary.warnings, JSON.stringify({ snapshotId: result.diffSnapshotId }), comparedAt,
    ],
  )
}

function toColumns(rows: ColumnRow[]): TenantColumnInspectionItem[] {
  return rows.map((row) => ({
    columnDefault: row.COLUMN_DEFAULT,
    columnName: row.COLUMN_NAME,
    columnType: row.COLUMN_TYPE,
    extra: row.EXTRA ?? "",
    isNullable: row.IS_NULLABLE === "YES",
    ordinalPosition: Number(row.ORDINAL_POSITION),
    tableName: row.TABLE_NAME,
  }))
}

function toIndexes(rows: IndexRow[]): TenantIndexInspectionItem[] {
  return rows.map((row) => ({
    columnName: row.COLUMN_NAME,
    indexName: row.INDEX_NAME,
    isUnique: Number(row.NON_UNIQUE) === 0,
    sequence: Number(row.SEQ_IN_INDEX),
    tableName: row.TABLE_NAME,
  }))
}

async function buildExpectedSchema(id: string): Promise<TenantDatabaseInspection> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const startedAt = new Date().toISOString()
  const config = {
    database: temporaryDatabaseName("cxsync_scratch"),
    host: tenant.localHost,
    password: tenant.localPassword,
    port: tenant.localPort,
    user: tenant.localUser,
  }
  let finalStatus: Partial<TenantSchemaBuildStatus> | null = null
  updateBuildStatus(id, {
    activity: ["Preparing expected schema build."],
    database: config.database,
    message: "Preparing isolated scratch database.",
    phase: "preparing",
    startedAt,
  })
  try {
    await cleanupStaleScratchDatabases(id, config, startedAt)
    await runScratchSchemaMigration(id, config, startedAt)
    updateBuildStatus(id, { message: "Inspecting generated schema metadata.", phase: "inspecting" })
    const inspection = await inspectDatabase(config)
    finalStatus = { activity: appendActivity(id, `Expected schema captured with ${inspection.totals.tableCount} tables.`), error: null, message: `Expected schema captured with ${inspection.totals.tableCount} tables.`, phase: "completed", tableCount: inspection.totals.tableCount }
    updateBuildStatus(id, finalStatus)
    return inspection
  } catch (error) {
    finalStatus = {
      activity: appendActivity(id, error instanceof Error ? error.message : "Expected schema build failed."),
      error: error instanceof Error ? error.message : "Expected schema build failed.",
      message: "Expected schema build failed.",
      phase: "failed",
    }
    updateBuildStatus(id, finalStatus)
    throw error
  } finally {
    const cleanupPhase = finalStatus?.phase === "completed" ? "completed" : "cleanup"
    updateBuildStatus(id, {
      activity: appendActivity(id, `Background scratch cleanup started for ${config.database}.`),
      message: finalStatus?.phase === "completed" ? finalStatus.message ?? "Expected schema is ready." : "Cleaning scratch database.",
      phase: cleanupPhase,
    })
    void dropScratchDatabase(config)
      .then(() => {
        updateBuildStatus(id, {
          activity: appendActivity(id, `Background scratch cleanup finished for ${config.database}.`),
          message: finalStatus?.phase === "completed" ? finalStatus.message ?? "Expected schema is ready." : "Scratch cleanup finished after failed build.",
          phase: finalStatus?.phase ?? "completed",
        })
      })
      .catch((error: unknown) => {
        updateBuildStatus(id, {
          activity: appendActivity(id, `Background scratch cleanup failed for ${config.database}. It will be retried before the next build.`),
          error: error instanceof Error ? error.message : "Background scratch cleanup failed.",
          message: finalStatus?.phase === "completed" ? finalStatus.message ?? "Expected schema is ready; scratch cleanup will retry later." : "Scratch cleanup failed.",
          phase: finalStatus?.phase ?? "failed",
        })
      })
    if (finalStatus) {
      updateBuildStatus(id, {
        ...finalStatus,
        activity: appendActivity(id, finalStatus.phase === "completed" ? "Expected schema is ready; scratch cleanup continues in the background." : "Expected schema build failed; scratch cleanup continues in the background."),
      })
    }
  }
}

async function runScratchSchemaMigration(id: string, config: { database: string; host: string; password: string; port: number; user: string }, startedAt: string) {
  const serverSource = await findServerSourceRoot()
  const workspaceRoot = resolve(serverSource, "../../..")
  const serverRoot = resolve(serverSource, "..")
  const runner = resolve(workspaceRoot, "node_modules/tsx/dist/cli.mjs")
  const script = resolve(serverSource, "infrastructure/tenant-database/build-scratch-schema.ts")
  const serverTsconfig = resolve(serverSource, "../tsconfig.json")
  await stat(runner).catch(() => { throw new Error("The TSX migration runner is unavailable. Run npm install in the workspace.") })
  await stat(serverTsconfig).catch(() => { throw new Error("The server TypeScript configuration is unavailable.") })
  const nodeExecutable = process.env.npm_node_execpath
  if (!nodeExecutable) throw new Error("Node.js runtime was not found. Start CXSync through npm run dev:cxsync.")

  const env = await loadCxSyncEnvironment()
  const timeoutMs = Number(env.CXSYNC_SCHEMA_BUILD_TIMEOUT_MS || 10 * 60 * 1000)
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(nodeExecutable, [runner, "--tsconfig", serverTsconfig, script], {
      cwd: serverRoot,
      env: {
        ...process.env,
        CXSYNC_SCRATCH_DB_HOST: config.host,
        CXSYNC_SCRATCH_DB_NAME: config.database,
        CXSYNC_SCRATCH_DB_PASSWORD: config.password,
        CXSYNC_SCRATCH_DB_PORT: String(config.port),
        CXSYNC_SCRATCH_DB_USER: config.user,
        TSX_TSCONFIG_PATH: serverTsconfig,
      },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    let settled = false
    updateBuildStatus(id, { activity: appendActivity(id, "Started backend tenant migration runner."), message: "Running backend tenant migrations in scratch database.", phase: "migrating", startedAt })
    const progress = setInterval(() => {
      void readScratchProgress(config).then((progress) => {
        updateBuildStatus(id, {
          activity: progress.operation ? appendActivity(id, progress.operation) : appendActivity(id, "MariaDB migration runner is active."),
          message: progress.operation ?? (progress.tableCount ? `Building expected schema... ${progress.tableCount} tables created so far.` : "Building expected schema..."),
          operation: progress.operation,
          phase: "migrating",
          processState: progress.processState,
          recentTables: progress.recentTables,
          tableCount: progress.tableCount,
        })
      }).catch(() => undefined)
    }, 2_500)
    const timeout = setTimeout(() => {
      if (settled) return
      settled = true
      child.kill()
      clearInterval(progress)
      updateBuildStatus(id, { activity: appendActivity(id, "Expected schema build timed out and the runner was stopped.") })
      reject(new Error(`Expected schema build exceeded ${Math.round(timeoutMs / 1000)} seconds. MariaDB may be blocked by a slow scratch cleanup or migration.`))
    }, timeoutMs)
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      clearInterval(progress)
      clearTimeout(timeout)
      error ? reject(error) : resolvePromise()
    }
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk)
      if (stdout.length > 8_000) stdout = stdout.slice(-8_000)
      updateBuildStatus(id, { activity: appendActivity(id, lastLine(stdout) ?? "Migration runner wrote output."), recentOutput: stdout.trim() || null })
    })
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk)
      if (stderr.length > 12_000) stderr = stderr.slice(-12_000)
      updateBuildStatus(id, { activity: appendActivity(id, lastLine(stderr) ?? "Migration runner wrote diagnostic output."), recentOutput: stderr.trim() || null })
    })
    child.on("error", finish)
    child.on("close", (code) => {
      if (code === 0) finish()
      else finish(new Error(`Expected schema build failed${stderr.trim() ? `: ${stderr.trim()}` : stdout.trim() ? `: ${stdout.trim()}` : ` with exit code ${code}`}`))
    })
  })
}

async function cleanupStaleScratchDatabases(id: string, config: { database: string; host: string; password: string; port: number; user: string }, startedAt: string) {
  const connection = await mysql.createConnection({ connectTimeout: 8_000, host: config.host, password: config.password, port: config.port, user: config.user })
  try {
    const [rows] = await connection.query<RowDataPacket[]>("SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME LIKE 'cxsync\\_scratch\\_%'")
    const stale = rows.map((row) => String(row.SCHEMA_NAME)).filter((name) => name !== config.database && /^cxsync_scratch_[a-z0-9_]+$/.test(name))
    if (!stale.length) updateBuildStatus(id, { activity: appendActivity(id, "No previous scratch database cleanup was needed.") })
    for (const database of stale) {
      updateBuildStatus(id, { activity: appendActivity(id, `Dropping previous scratch database ${database}.`), database: config.database, message: `Cleaning previous scratch database ${database}.`, phase: "cleanup", startedAt })
      await connection.query(`DROP DATABASE IF EXISTS \`${database}\``)
      updateBuildStatus(id, { activity: appendActivity(id, `Dropped previous scratch database ${database}.`) })
    }
  } finally {
    await connection.end().catch(() => undefined)
  }
}

async function readScratchProgress(config: { database: string; host: string; password: string; port: number; user: string }): Promise<ScratchProgress> {
  const connection = await mysql.createConnection({ connectTimeout: 4_000, host: config.host, password: config.password, port: config.port, user: config.user })
  try {
    const [rows] = await connection.execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS table_count FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?",
      [config.database],
    )
    const [tables] = await connection.execute<RowDataPacket[]>(
      `SELECT TABLE_NAME
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ?
       ORDER BY COALESCE(CREATE_TIME, UPDATE_TIME) DESC, TABLE_NAME DESC
       LIMIT 6`,
      [config.database],
    )
    const [processes] = await connection.query<RowDataPacket[]>("SHOW FULL PROCESSLIST")
    const related = processes.find((process) => String(process.db ?? "") === config.database || String(process.Info ?? "").includes(config.database))
    return {
      operation: related ? describeMariaDbOperation(String(related.Info ?? ""), String(related.State ?? "")) : null,
      processState: related ? [related.Command, related.State, Number(related.Time) ? `${related.Time}s` : ""].filter(Boolean).join(" · ") : null,
      recentTables: tables.map((table) => String(table.TABLE_NAME)),
      tableCount: Number(rows[0]?.table_count ?? 0),
    }
  } finally {
    await connection.end().catch(() => undefined)
  }
}

async function dropScratchDatabase(config: { database: string; host: string; password: string; port: number; user: string }) {
  if (!/^cxsync_scratch_[a-z0-9_]+$/.test(config.database)) throw new Error("Refusing to drop a non-scratch database.")
  const connection = await mysql.createConnection({ connectTimeout: 8_000, host: config.host, password: config.password, port: config.port, user: config.user })
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${config.database}\``)
  } finally {
    await connection.end()
  }
}

async function findServerSourceRoot() {
  const start = dirname(fileURLToPath(import.meta.url))
  const candidates = [
    resolve(process.cwd(), "../../apps/server/src"),
    resolve(process.cwd(), "../server/src"),
    resolve(process.cwd(), "apps/server/src"),
    resolve(start, "../../../../../server/src"),
    resolve(start, "../../../../../../apps/server/src"),
  ]
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isDirectory()) return candidate
    } catch {
      // Try next candidate.
    }
  }
  throw new Error("Server source folder was not found. Expected schema build needs apps/server/src.")
}

function idleBuildStatus(): TenantSchemaBuildStatus {
  return {
    activity: [],
    database: null,
    elapsedMs: 0,
    error: null,
    message: "Expected schema build has not started.",
    operation: null,
    phase: "idle",
    processState: null,
    recentOutput: null,
    recentTables: [],
    startedAt: null,
    tableCount: 0,
    updatedAt: new Date().toISOString(),
  }
}

function updateBuildStatus(id: string, patch: Partial<TenantSchemaBuildStatus>) {
  const previous = schemaBuildStatuses.get(id) ?? idleBuildStatus()
  const startedAt = patch.startedAt ?? previous.startedAt
  const updatedAt = new Date().toISOString()
  schemaBuildStatuses.set(id, {
    ...previous,
    ...patch,
    elapsedMs: startedAt ? Date.now() - new Date(startedAt).getTime() : 0,
    error: patch.error === undefined ? previous.error : patch.error,
    startedAt,
    updatedAt,
  })
}

function describeMariaDbOperation(info: string, state: string) {
  const normalized = info.replace(/\s+/g, " ").trim()
  if (!normalized) return state ? `MariaDB: ${state}` : null
  const createTable = normalized.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i)
  if (createTable) return `Creating table ${createTable[1]}`
  const alterAddColumn = normalized.match(/ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i)
  if (alterAddColumn) return `Adding column ${alterAddColumn[2]} on ${alterAddColumn[1]}`
  const alterModify = normalized.match(/ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s+MODIFY\s+(?:COLUMN\s+)?`?([a-zA-Z0-9_]+)`?/i)
  if (alterModify) return `Modifying column ${alterModify[2]} on ${alterModify[1]}`
  const alterIndex = normalized.match(/ALTER\s+TABLE\s+`?([a-zA-Z0-9_]+)`?.*(?:ADD|DROP)\s+(?:UNIQUE\s+)?(?:INDEX|KEY)\s+`?([a-zA-Z0-9_]+)`?/i)
  if (alterIndex) return `Updating index ${alterIndex[2]} on ${alterIndex[1]}`
  const dropDatabase = normalized.match(/DROP\s+DATABASE\s+(?:IF\s+EXISTS\s+)?`?([a-zA-Z0-9_]+)`?/i)
  if (dropDatabase) return `Dropping scratch database ${dropDatabase[1]}`
  return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized
}

function appendActivity(id: string, line: string) {
  const previous = schemaBuildStatuses.get(id)?.activity ?? []
  const normalized = line.trim()
  if (!normalized) return previous
  if (previous[previous.length - 1] === normalized) return previous
  return [...previous, normalized].slice(-12)
}

function temporaryDatabaseName(prefix: "cxsync_scratch" | "cxsync_restore") {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 10)}`
}

async function codebaseSchemaSourceHash(serverSource: string) {
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

async function migrationSourceFiles(root: string): Promise<string[]> {
  const results: string[] = []
  async function visit(directory: string) {
    const entries = await readdir(directory, { withFileTypes: true })
    for (const entry of entries) {
      const path = resolve(directory, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
      } else if (entry.isFile() && /\.ts$/.test(entry.name) && /migration|migrations|database/.test(path.replaceAll("\\", "/"))) {
        results.push(path)
      }
    }
  }
  await visit(root)
  return results
}

function lastLine(value: string) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).at(-1) ?? null
}

function summarizeSchema(columns: TenantColumnInspectionItem[], indexes: TenantIndexInspectionItem[]) {
  const results = new Map<string, { columnCount: number; hasPrimaryKey: boolean; indexCount: number }>()
  for (const column of columns) {
    const current = results.get(column.tableName) ?? { columnCount: 0, hasPrimaryKey: false, indexCount: 0 }
    current.columnCount += 1
    results.set(column.tableName, current)
  }
  const uniqueIndexes = new Map<string, Set<string>>()
  for (const index of indexes) {
    const names = uniqueIndexes.get(index.tableName) ?? new Set<string>()
    names.add(index.indexName)
    uniqueIndexes.set(index.tableName, names)
    const current = results.get(index.tableName) ?? { columnCount: 0, hasPrimaryKey: false, indexCount: 0 }
    if (index.indexName === "PRIMARY") current.hasPrimaryKey = true
    results.set(index.tableName, current)
  }
  for (const [tableName, names] of uniqueIndexes) {
    const current = results.get(tableName) ?? { columnCount: 0, hasPrimaryKey: false, indexCount: 0 }
    current.indexCount = names.size
    results.set(tableName, current)
  }
  return results
}

function diffInspections(expected: TenantDatabaseInspection, actual: TenantDatabaseInspection): TenantSchemaDiffItem[] {
  const items: TenantSchemaDiffItem[] = []
  const expectedTables = new Map(expected.tables.map((table) => [table.tableName, table]))
  const actualTables = new Map(actual.tables.map((table) => [table.tableName, table]))
  for (const table of expected.tables) {
    const current = actualTables.get(table.tableName)
    if (!current) {
      items.push({ message: `Table ${table.tableName} is missing locally.`, objectName: table.tableName, objectType: "table", severity: "critical", status: "missing" })
      continue
    }
    if (table.engine !== current.engine) {
      items.push({ actual: current.engine, expected: table.engine, message: `Table engine changed for ${table.tableName}.`, objectName: table.tableName, objectType: "table", severity: "warning", status: "changed" })
    }
    if (table.hasPrimaryKey && !current.hasPrimaryKey) {
      items.push({ expected: "PRIMARY", message: `Primary key is missing on ${table.tableName}.`, objectName: table.tableName, objectType: "primary-key", severity: "critical", status: "missing" })
    }
  }
  for (const table of actual.tables) {
    if (!expectedTables.has(table.tableName)) items.push({ message: `Extra table ${table.tableName} exists locally.`, objectName: table.tableName, objectType: "table", severity: "info", status: "extra" })
  }

  const expectedColumns = new Map(expected.columns.map((column) => [columnKey(column), column]))
  const actualColumns = new Map(actual.columns.map((column) => [columnKey(column), column]))
  for (const column of expected.columns) {
    const current = actualColumns.get(columnKey(column))
    const objectName = `${column.tableName}.${column.columnName}`
    if (!current) {
      items.push({ message: `Column ${objectName} is missing locally.`, objectName, objectType: "column", severity: "critical", status: "missing" })
      continue
    }
    if (column.columnType !== current.columnType) items.push({ actual: current.columnType, expected: column.columnType, message: `Column type changed for ${objectName}.`, objectName, objectType: "column", severity: "critical", status: "changed" })
    if (column.isNullable !== current.isNullable) items.push({ actual: current.isNullable ? "nullable" : "not nullable", expected: column.isNullable ? "nullable" : "not nullable", message: `Nullability changed for ${objectName}.`, objectName, objectType: "column", severity: "warning", status: "changed" })
    if ((column.columnDefault ?? "") !== (current.columnDefault ?? "")) items.push({ actual: current.columnDefault ?? "", expected: column.columnDefault ?? "", message: `Default value changed for ${objectName}.`, objectName, objectType: "column", severity: "warning", status: "changed" })
    if (column.extra !== current.extra) items.push({ actual: current.extra, expected: column.extra, message: `Column extra metadata changed for ${objectName}.`, objectName, objectType: "column", severity: "warning", status: "changed" })
  }
  for (const column of actual.columns) {
    if (!expectedColumns.has(columnKey(column))) items.push({ message: `Extra column ${column.tableName}.${column.columnName} exists locally.`, objectName: `${column.tableName}.${column.columnName}`, objectType: "column", severity: "info", status: "extra" })
  }

  const expectedIndexes = indexSignatures(expected.indexes)
  const actualIndexes = indexSignatures(actual.indexes)
  for (const [key, expectedSignature] of expectedIndexes) {
    const actualSignature = actualIndexes.get(key)
    if (!actualSignature) items.push({ expected: expectedSignature, message: `Index ${key} is missing locally.`, objectName: key, objectType: "index", severity: "warning", status: "missing" })
    else if (actualSignature !== expectedSignature) items.push({ actual: actualSignature, expected: expectedSignature, message: `Index definition changed for ${key}.`, objectName: key, objectType: "index", severity: "warning", status: "changed" })
  }
  for (const key of actualIndexes.keys()) {
    if (!expectedIndexes.has(key)) items.push({ actual: actualIndexes.get(key), message: `Extra index ${key} exists locally.`, objectName: key, objectType: "index", severity: "info", status: "extra" })
  }

  return items
}

function summarizeDiff(items: TenantSchemaDiffItem[]) {
  return {
    changed: items.filter((item) => item.status === "changed").length,
    critical: items.filter((item) => item.severity === "critical").length,
    extra: items.filter((item) => item.status === "extra").length,
    missing: items.filter((item) => item.status === "missing").length,
    total: items.length,
    warnings: items.filter((item) => item.severity === "warning").length,
  }
}

function emptyDiffResult(inspection: TenantDatabaseInspection): TenantSchemaDiffResult {
  return {
    baseline: null,
    comparedAt: new Date().toISOString(),
    currentSnapshotId: inspection.snapshotId,
    diffSnapshotId: randomUUID(),
    items: [],
    summary: { changed: 0, critical: 0, extra: 0, missing: 0, total: 0, warnings: 0 },
  }
}

function toBaseline(row: BaselineRow): TenantSchemaBaseline {
  const inspection = JSON.parse(row.manifest_json) as TenantDatabaseInspection
  return {
    baselineName: row.baseline_name,
    capturedAt: isoDate(row.created_at),
    id: row.id,
    schemaHash: row.schema_hash,
    source: row.source,
    totals: inspection.totals,
  }
}

function hashInspection(inspection: TenantDatabaseInspection) {
  return createHash("sha256").update(JSON.stringify({
    columns: inspection.columns,
    indexes: inspection.indexes,
    tables: inspection.tables.map(({ dataLength, indexLength, rowsEstimate, updatedAt, ...table }) => table),
  })).digest("hex")
}

function columnKey(column: TenantColumnInspectionItem) {
  return `${column.tableName}.${column.columnName}`
}

function indexSignatures(indexes: TenantIndexInspectionItem[]) {
  const grouped = new Map<string, TenantIndexInspectionItem[]>()
  for (const index of indexes) {
    const key = `${index.tableName}.${index.indexName}`
    grouped.set(key, [...(grouped.get(key) ?? []), index])
  }
  const results = new Map<string, string>()
  for (const [key, parts] of grouped) {
    const ordered = parts.sort((a, b) => a.sequence - b.sequence)
    results.set(key, `${ordered[0]?.isUnique ? "unique" : "nonunique"}:${ordered.map((part) => part.columnName).join(",")}`)
  }
  return results
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}

function isoDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString()
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`
}
