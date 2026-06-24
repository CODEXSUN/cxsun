import { randomUUID } from "node:crypto"
import { createWriteStream } from "node:fs"
import { mkdir, rename, rm, stat } from "node:fs/promises"
import { resolve } from "node:path"
import { spawn } from "node:child_process"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { SqlDumpCredentials, SqlDumpDatabase, SqlDumpJob, SqlDumpQueue, SqlDumpServerCredentials, SqlDumpTable } from "../../src/shared/connection-contracts.js"
import { findDumpTool } from "./tenant-backup-manager.js"

type TableRow = RowDataPacket & { TABLE_NAME: string; TABLE_ROWS: number | null; SIZE_BYTES: number | string | null }
type DatabaseRow = RowDataPacket & { DATABASE_NAME: string; SIZE_BYTES: number | string | null; TABLE_COUNT: number | string }

const jobs = new Map<string, SqlDumpJob>()
const queues = new Map<string, { id: string; itemIds: string[]; running: boolean }>()

export async function listSqlDumpDatabases(credentials: SqlDumpServerCredentials): Promise<SqlDumpDatabase[]> {
  const input = normalizeServerCredentials(credentials)
  const connection = await mysql.createConnection({ connectTimeout: 10_000, host: input.host, password: input.password, port: input.port, user: input.user })
  try {
    const [rows] = await connection.execute<DatabaseRow[]>(
      `SELECT s.SCHEMA_NAME AS DATABASE_NAME, COUNT(t.TABLE_NAME) AS TABLE_COUNT,
              COALESCE(SUM(COALESCE(t.DATA_LENGTH, 0) + COALESCE(t.INDEX_LENGTH, 0)), 0) AS SIZE_BYTES
       FROM information_schema.SCHEMATA s
       LEFT JOIN information_schema.TABLES t ON t.TABLE_SCHEMA = s.SCHEMA_NAME AND t.TABLE_TYPE = 'BASE TABLE'
       WHERE s.SCHEMA_NAME NOT IN ('information_schema', 'mysql', 'performance_schema', 'sys')
       GROUP BY s.SCHEMA_NAME ORDER BY s.SCHEMA_NAME`,
    )
    return rows.map((row) => ({ name: row.DATABASE_NAME, sizeBytes: Number(row.SIZE_BYTES ?? 0), tableCount: Number(row.TABLE_COUNT ?? 0) }))
  } finally {
    await connection.end().catch(() => undefined)
  }
}

export async function inspectSqlDumpTables(credentials: SqlDumpCredentials): Promise<SqlDumpTable[]> {
  const input = normalizeCredentials(credentials)
  const connection = await mysql.createConnection({ connectTimeout: 10_000, host: input.host, password: input.password, port: input.port, user: input.user })
  try {
    const [rows] = await connection.execute<TableRow[]>(
      `SELECT TABLE_NAME, TABLE_ROWS, COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0) AS SIZE_BYTES
       FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
      [input.database],
    )
    if (!rows.length) throw new Error("The database has no base tables or could not be found.")
    return rows.map((row) => ({ name: row.TABLE_NAME, rows: Number(row.TABLE_ROWS ?? 0), sizeBytes: Number(row.SIZE_BYTES ?? 0) }))
  } finally {
    await connection.end().catch(() => undefined)
  }
}

export async function startSqlDump(credentials: SqlDumpCredentials, destination: string): Promise<SqlDumpJob> {
  const input = normalizeCredentials(credentials)
  if (!destination?.trim()) throw new Error("Choose a destination folder before starting the dump.")
  const dumpTool = await findDumpTool()
  if (!dumpTool) throw new Error("MariaDB dump utility was not found. Install MariaDB/MySQL client tools or configure CXSYNC_MARIADB_DUMP_PATH.")
  const prepared = await prepareJob(input, destination)
  const job = prepared.job
  job.status = "running"
  void executeDump(job.id, dumpTool, prepared.path, input, prepared.estimatedBytes)
  return { ...job }
}

export function getSqlDumpJob(id: string): SqlDumpJob | null {
  const job = jobs.get(id)
  return job ? { ...job } : null
}

export async function startSqlDumpQueue(credentials: SqlDumpServerCredentials, databases: string[], destination: string): Promise<SqlDumpQueue> {
  const server = normalizeServerCredentials(credentials)
  const selected = [...new Set(databases.map((name) => normalizeDatabaseName(name)))]
  if (!selected.length) throw new Error("Select at least one database for the dump queue.")
  if (!destination?.trim()) throw new Error("Choose a destination folder before starting the dump queue.")
  const dumpTool = await findDumpTool()
  if (!dumpTool) throw new Error("MariaDB dump utility was not found. Install MariaDB/MySQL client tools or configure CXSYNC_MARIADB_DUMP_PATH.")
  const prepared = []
  for (const database of selected) prepared.push(await prepareJob({ ...server, database }, destination))
  const queue = { id: randomUUID(), itemIds: prepared.map((item) => item.job.id), running: true }
  queues.set(queue.id, queue)
  void executeQueue(queue.id, dumpTool, server, prepared)
  return getSqlDumpQueue(queue.id)!
}

export function getSqlDumpQueue(id: string): SqlDumpQueue | null {
  const queue = queues.get(id)
  if (!queue) return null
  const items = queue.itemIds.map((itemId) => jobs.get(itemId)).filter((job): job is SqlDumpJob => Boolean(job)).map((job) => ({ ...job }))
  const completedCount = items.filter((item) => item.status === "completed").length
  const failedCount = items.filter((item) => item.status === "failed").length
  const queuedCount = items.filter((item) => item.status === "queued").length
  const status = queue.running ? (items.some((item) => item.status === "running") ? "running" : "queued") : failedCount ? "completed-with-errors" : "completed"
  return { completedCount, failedCount, id, items, queuedCount, status, totalCount: items.length }
}

async function prepareJob(credentials: SqlDumpCredentials, destination: string) {
  const tables = await inspectSqlDumpTables(credentials)
  const directory = resolve(destination)
  await mkdir(directory, { recursive: true })
  const timestamp = new Date().toISOString().slice(0, 13)
  const path = resolve(directory, `${safeSegment(credentials.database)}-${timestamp}.sql`)
  const job: SqlDumpJob = { completedAt: null, database: credentials.database, destination: directory, error: null, fileName: null, id: randomUUID(), progress: 0, sizeBytes: 0, startedAt: new Date().toISOString(), status: "queued", tableCount: tables.length }
  jobs.set(job.id, job)
  return { estimatedBytes: tables.reduce((sum, table) => sum + table.sizeBytes, 0), job, path }
}

async function executeQueue(queueId: string, tool: string, server: SqlDumpServerCredentials, prepared: Array<Awaited<ReturnType<typeof prepareJob>>>) {
  try {
    for (const item of prepared) {
      item.job.status = "running"
      item.job.progress = 1
      await executeDump(item.job.id, tool, item.path, { ...server, database: item.job.database }, item.estimatedBytes)
    }
  } finally {
    const queue = queues.get(queueId)
    if (queue) queue.running = false
  }
}

async function executeDump(id: string, tool: string, path: string, credentials: SqlDumpCredentials, estimatedBytes: number) {
  const job = jobs.get(id)
  if (!job) return
  const partialPath = `${path}.partial`
  try {
    await new Promise<void>((resolvePromise, reject) => {
      const output = createWriteStream(partialPath, { flags: "wx" })
      const child = spawn(tool, dumpArguments(credentials), {
        env: { ...process.env, MYSQL_PWD: credentials.password },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      })
      let stderr = ""
      let written = 0
      child.stdout.on("data", (chunk: Buffer) => {
        written += chunk.length
        job.sizeBytes = written
        job.progress = estimatedBytes > 0 ? Math.min(95, Math.max(2, Math.round((written / estimatedBytes) * 90))) : Math.min(95, job.progress + 1)
      })
      child.stdout.pipe(output)
      child.stderr.on("data", (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
      child.on("error", reject)
      output.on("error", reject)
      child.on("close", (code) => output.end(() => code === 0 ? resolvePromise() : reject(new Error(stderr.trim() || `Dump exited with code ${code}.`))))
    })
    const file = await stat(partialPath)
    if (file.size <= 0) throw new Error("The SQL dump file is empty.")
    await rename(partialPath, path)
    Object.assign(job, { completedAt: new Date().toISOString(), fileName: path, progress: 100, sizeBytes: file.size, status: "completed" as const })
  } catch (reason) {
    await rm(partialPath, { force: true }).catch(() => undefined)
    Object.assign(job, { completedAt: new Date().toISOString(), error: messageOf(reason), progress: 100, status: "failed" as const })
  }
}

function dumpArguments(credentials: SqlDumpCredentials) {
  return [
    `--host=${credentials.host}`,
    `--port=${credentials.port}`,
    `--user=${credentials.user}`,
    "--single-transaction",
    "--quick",
    "--routines",
    "--triggers",
    "--events",
    "--hex-blob",
    "--default-character-set=utf8mb4",
    "--databases",
    credentials.database,
  ]
}

function normalizeCredentials(input: SqlDumpCredentials): SqlDumpCredentials {
  return { ...normalizeServerCredentials(input), database: normalizeDatabaseName(input.database) }
}

function normalizeServerCredentials(input: SqlDumpServerCredentials): SqlDumpServerCredentials {
  const credentials = { host: input?.host?.trim(), password: input?.password ?? "", port: Number(input?.port), user: input?.user?.trim() }
  if (!credentials.host || !credentials.user || !credentials.password) throw new Error("Host, port, user, and password are required.")
  if (!Number.isInteger(credentials.port) || credentials.port < 1 || credentials.port > 65535) throw new Error("Database port must be between 1 and 65535.")
  return credentials
}

function normalizeDatabaseName(value: string) { const name = value?.trim(); if (!name || !/^[A-Za-z0-9_$-]+$/.test(name)) throw new Error("Database name contains unsupported characters."); return name }

function safeSegment(value: string) { return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "database" }
function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : "SQL dump failed." }
