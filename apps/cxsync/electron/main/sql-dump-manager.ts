import { randomUUID } from "node:crypto"
import { createWriteStream } from "node:fs"
import { mkdir, rm, stat } from "node:fs/promises"
import { resolve } from "node:path"
import { spawn } from "node:child_process"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { SqlDumpCredentials, SqlDumpJob, SqlDumpTable } from "../../src/shared/connection-contracts.js"
import { findDumpTool } from "./tenant-backup-manager.js"

type TableRow = RowDataPacket & { TABLE_NAME: string; TABLE_ROWS: number | null; SIZE_BYTES: number | string | null }

const jobs = new Map<string, SqlDumpJob>()

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
  const tables = await inspectSqlDumpTables(input)
  const dumpTool = await findDumpTool()
  if (!dumpTool) throw new Error("MariaDB dump utility was not found. Install MariaDB/MySQL client tools or configure CXSYNC_MARIADB_DUMP_PATH.")
  const directory = resolve(destination)
  await mkdir(directory, { recursive: true })
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")
  const fileName = `${safeSegment(input.database)}-full-${timestamp}.sql`
  const path = resolve(directory, fileName)
  const job: SqlDumpJob = {
    completedAt: null,
    database: input.database,
    destination: directory,
    error: null,
    fileName: null,
    id: randomUUID(),
    progress: 1,
    sizeBytes: 0,
    startedAt: new Date().toISOString(),
    status: "running",
    tableCount: tables.length,
  }
  jobs.set(job.id, job)
  void executeDump(job.id, dumpTool, path, input, tables.reduce((sum, table) => sum + table.sizeBytes, 0))
  return { ...job }
}

export function getSqlDumpJob(id: string): SqlDumpJob | null {
  const job = jobs.get(id)
  return job ? { ...job } : null
}

async function executeDump(id: string, tool: string, path: string, credentials: SqlDumpCredentials, estimatedBytes: number) {
  const job = jobs.get(id)
  if (!job) return
  try {
    await new Promise<void>((resolvePromise, reject) => {
      const output = createWriteStream(path, { flags: "wx" })
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
    const file = await stat(path)
    if (file.size <= 0) throw new Error("The SQL dump file is empty.")
    Object.assign(job, { completedAt: new Date().toISOString(), fileName: path, progress: 100, sizeBytes: file.size, status: "completed" as const })
  } catch (reason) {
    await rm(path, { force: true }).catch(() => undefined)
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
  const credentials = { database: input.database?.trim(), host: input.host?.trim(), password: input.password ?? "", port: Number(input.port), user: input.user?.trim() }
  if (!credentials.host || !credentials.user || !credentials.database || !credentials.password) throw new Error("Host, port, user, password, and database are required.")
  if (!Number.isInteger(credentials.port) || credentials.port < 1 || credentials.port > 65535) throw new Error("Database port must be between 1 and 65535.")
  if (!/^[A-Za-z0-9_$-]+$/.test(credentials.database)) throw new Error("Database name contains unsupported characters.")
  return credentials
}

function safeSegment(value: string) { return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "database" }
function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : "SQL dump failed." }
