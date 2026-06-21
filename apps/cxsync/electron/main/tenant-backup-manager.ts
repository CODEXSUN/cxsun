import { app } from "electron"
import { createHash, randomUUID } from "node:crypto"
import { createReadStream, createWriteStream } from "node:fs"
import { access, mkdir, rm, stat } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { spawn } from "node:child_process"
import mysql from "mysql2/promise"
import type { RowDataPacket } from "mysql2"
import type { TenantBackupRecord } from "../../src/shared/connection-contracts.js"
import { getCxSyncDatabase } from "./cxsync-database.js"
import { loadCxSyncEnvironment } from "./environment.js"
import { getPrivateTenantConnection } from "./tenant-connection-store.js"
import { getTenantUpgradePlan } from "./tenant-upgrade-planner.js"

type BackupRow = RowDataPacket & {
  created_at: Date | string
  database_name: string
  file_name: string
  id: string
  plan_id: string
  restore_database: string | null
  restore_verified_at: Date | string | null
  schema_hash: string | null
  sha256: string
  size_bytes: number
  status: "restore-verified" | "verified" | "failed"
  table_count: number
}

export async function createTenantBackup(id: string): Promise<TenantBackupRecord> {
  const tenant = await getPrivateTenantConnection(id)
  if (!tenant) throw new Error("Tenant connection was not found.")
  const plan = await getTenantUpgradePlan(id)
  if (!plan) throw new Error("Generate an upgrade plan before creating its recovery backup.")
  const dumpTool = await findDumpTool()
  if (!dumpTool) throw new Error("MariaDB dump utility was not found. Install MariaDB/MySQL client tools, or set CXSYNC_MARIADB_DUMP_PATH in .env to the full mariadb-dump.exe/mysqldump.exe path.")
  const clientTool = await findClientTool(dumpTool)
  if (!clientTool) throw new Error("MariaDB client utility was not found. Install MariaDB/MySQL client tools, or set CXSYNC_MARIADB_CLIENT_PATH in .env to the full mariadb.exe/mysql.exe path.")

  const directory = resolve(app.getPath("userData"), "backups", safeSegment(tenant.tenantCode))
  await mkdir(directory, { recursive: true })
  const timestamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-")
  const path = resolve(directory, `${safeSegment(tenant.localDatabase)}-${timestamp}.sql`)
  try {
    await runDump(dumpTool, path, tenant)
    const file = await stat(path)
    if (file.size <= 0) throw new Error("The backup file is empty.")
    const restore = await verifyRestore(clientTool, path, tenant)
    const record: TenantBackupRecord = {
      createdAt: new Date().toISOString(),
      database: tenant.localDatabase,
      fileName: path,
      id: randomUUID(),
      planId: plan.id,
      restoreDatabase: restore.database,
      restoreVerifiedAt: new Date().toISOString(),
      schemaHash: restore.schemaHash,
      sha256: await hashFile(path),
      sizeBytes: file.size,
      status: "restore-verified",
      tableCount: restore.tableCount,
    }
    await saveBackup(id, record)
    return record
  } catch (error) {
    await rm(path, { force: true }).catch(() => undefined)
    throw error
  }
}

export async function getTenantBackup(id: string): Promise<TenantBackupRecord | null> {
  const database = await getCxSyncDatabase()
  const [rows] = await database.execute<BackupRow[]>("SELECT * FROM cxsync_tenant_backups WHERE tenant_connection_id = ? ORDER BY created_at DESC LIMIT 1", [id])
  return rows[0] ? toRecord(rows[0]) : null
}

async function findDumpTool(): Promise<string | null> {
  const env = await loadCxSyncEnvironment()
  const configured = env.CXSYNC_MARIADB_DUMP_PATH?.trim()
  const candidates = [
    configured,
    "C:\\Program Files\\MariaDB 11.8\\bin\\mariadb-dump.exe",
    "C:\\Program Files\\MariaDB 11.7\\bin\\mariadb-dump.exe",
    "C:\\Program Files\\MariaDB 11.4\\bin\\mariadb-dump.exe",
    "C:\\Program Files\\MariaDB 10.11\\bin\\mariadb-dump.exe",
    "C:\\Program Files\\MariaDB 10.6\\bin\\mariadb-dump.exe",
    "C:\\Program Files\\MariaDB 10.5\\bin\\mariadb-dump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysqldump.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysqldump.exe",
    "C:\\xampp\\mysql\\bin\\mysqldump.exe",
  ].filter((value): value is string => Boolean(value))
  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next known installation path.
    }
  }
  return await findToolOnPath("mariadb-dump.exe")
    ?? await findToolOnPath("mariadb-dump")
    ?? await findToolOnPath("mysqldump.exe")
    ?? await findToolOnPath("mysqldump")
}

async function findClientTool(dumpTool: string): Promise<string | null> {
  const env = await loadCxSyncEnvironment()
  const configured = env.CXSYNC_MARIADB_CLIENT_PATH?.trim()
  const siblingDirectory = dirname(dumpTool)
  const candidates = [
    configured,
    resolve(siblingDirectory, "mariadb.exe"),
    resolve(siblingDirectory, "mysql.exe"),
    "C:\\Program Files\\MariaDB 11.8\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 11.7\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 11.4\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 10.11\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 10.6\\bin\\mariadb.exe",
    "C:\\Program Files\\MariaDB 10.5\\bin\\mariadb.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
    "C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysql.exe",
    "C:\\xampp\\mysql\\bin\\mysql.exe",
  ].filter((value): value is string => Boolean(value))
  for (const candidate of candidates) {
    try {
      await access(candidate)
      return candidate
    } catch {
      // Try the next known installation path.
    }
  }
  return await findToolOnPath("mariadb.exe")
    ?? await findToolOnPath("mariadb")
    ?? await findToolOnPath("mysql.exe")
    ?? await findToolOnPath("mysql")
}

async function findToolOnPath(name: string) {
  return new Promise<string | null>((resolvePromise) => {
    const child = spawn("where.exe", [name], { stdio: ["ignore", "pipe", "ignore"], windowsHide: true })
    let output = ""
    child.stdout.on("data", (chunk) => { output += String(chunk) })
    child.on("error", () => resolvePromise(null))
    child.on("close", (code) => resolvePromise(code === 0 ? output.split(/\r?\n/).map((value) => value.trim()).find(Boolean) ?? null : null))
  })
}

async function runDump(tool: string, path: string, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>) {
  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(path, { flags: "wx" })
    const child = spawn(tool, [
      `--host=${tenant.localHost}`,
      `--port=${tenant.localPort}`,
      `--user=${tenant.localUser}`,
      "--single-transaction",
      "--quick",
      "--routines",
      "--triggers",
      "--events",
      "--hex-blob",
      "--default-character-set=utf8mb4",
      tenant.localDatabase,
    ], { env: { ...process.env, MYSQL_PWD: tenant.localPassword }, stdio: ["ignore", "pipe", "pipe"], windowsHide: true })
    let stderr = ""
    child.stdout.pipe(output)
    child.stderr.on("data", (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
    child.on("error", reject)
    output.on("error", reject)
    child.on("close", (code) => {
      output.end(() => code === 0 ? resolvePromise() : reject(new Error(`Tenant backup failed${stderr.trim() ? `: ${stderr.trim()}` : ` with exit code ${code}`}`)))
    })
  })
}

async function verifyRestore(tool: string, path: string, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>) {
  const database = temporaryDatabaseName("cxsync_restore")
  let connection: mysql.Connection | undefined
  try {
    connection = await mysql.createConnection({
      connectTimeout: 8_000,
      host: tenant.localHost,
      password: tenant.localPassword,
      port: tenant.localPort,
      user: tenant.localUser,
    })
    await connection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    const sourceFingerprint = await schemaFingerprint(connection, tenant.localDatabase)
    await runRestore(tool, path, database, tenant)
    const restoredFingerprint = await schemaFingerprint(connection, database)
    if (!restoredFingerprint.tableCount) throw new Error("Restore verification produced an empty database.")
    if (sourceFingerprint.schemaHash !== restoredFingerprint.schemaHash) {
      throw new Error(`Restore verification schema mismatch: source has ${sourceFingerprint.tableCount} tables, restored backup has ${restoredFingerprint.tableCount}.`)
    }
    return { database, ...restoredFingerprint }
  } finally {
    if (connection) {
      await connection.query(`DROP DATABASE IF EXISTS \`${database}\``).catch(() => undefined)
      await connection.end().catch(() => undefined)
    }
  }
}

async function runRestore(tool: string, path: string, database: string, tenant: NonNullable<Awaited<ReturnType<typeof getPrivateTenantConnection>>>) {
  await new Promise<void>((resolvePromise, reject) => {
    const input = createReadStream(path)
    const child = spawn(tool, [
      `--host=${tenant.localHost}`,
      `--port=${tenant.localPort}`,
      `--user=${tenant.localUser}`,
      "--default-character-set=utf8mb4",
      database,
    ], { env: { ...process.env, MYSQL_PWD: tenant.localPassword }, stdio: ["pipe", "ignore", "pipe"], windowsHide: true })
    let stderr = ""
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      error ? reject(error) : resolvePromise()
    }
    input.on("error", (error) => finish(error))
    child.stdin.on("error", (error) => finish(error))
    child.stderr.on("data", (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
    child.on("error", (error) => finish(error))
    child.on("close", (code) => finish(code === 0 ? undefined : new Error(`Backup restore test failed${stderr.trim() ? `: ${stderr.trim()}` : ` with exit code ${code}`}`)))
    input.pipe(child.stdin)
  })
}

async function schemaFingerprint(connection: mysql.Connection, database: string) {
  const [tables] = await connection.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME, TABLE_TYPE, COALESCE(ENGINE, '') AS ENGINE, COALESCE(TABLE_COLLATION, '') AS TABLE_COLLATION
     FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [database],
  )
  const [columns] = await connection.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [database],
  )
  const [indexes] = await connection.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME, INDEX_NAME, COLUMN_NAME, NON_UNIQUE, SEQ_IN_INDEX
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX`,
    [database],
  )
  return {
    schemaHash: createHash("sha256").update(JSON.stringify({ columns, indexes, tables })).digest("hex"),
    tableCount: tables.length,
  }
}

async function hashFile(path: string) {
  const hash = createHash("sha256")
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest("hex")
}

async function saveBackup(id: string, record: TenantBackupRecord) {
  const database = await getCxSyncDatabase()
  await database.execute(
    `INSERT INTO cxsync_tenant_backups
      (id, tenant_connection_id, plan_id, database_name, file_name, size_bytes, sha256, status, restore_database, restore_verified_at, schema_hash, table_count, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.id, id, record.planId, record.database, record.fileName, record.sizeBytes, record.sha256, record.status, record.restoreDatabase, record.restoreVerifiedAt ? sqlDate(new Date(record.restoreVerifiedAt)) : null, record.schemaHash, record.tableCount, sqlDate(new Date(record.createdAt))],
  )
}

function toRecord(row: BackupRow): TenantBackupRecord {
  return {
    createdAt: isoDate(row.created_at),
    database: row.database_name,
    fileName: row.file_name,
    id: row.id,
    planId: row.plan_id,
    restoreDatabase: row.restore_database,
    restoreVerifiedAt: row.restore_verified_at ? isoDate(row.restore_verified_at) : null,
    schemaHash: row.schema_hash,
    sha256: row.sha256,
    sizeBytes: Number(row.size_bytes),
    status: row.status,
    tableCount: Number(row.table_count),
  }
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_") || "tenant"
}

function temporaryDatabaseName(prefix: "cxsync_restore") {
  return `${prefix}_${randomUUID().replaceAll("-", "").slice(0, 10)}`
}

function sqlDate(value: Date) {
  return value.toISOString().slice(0, 23).replace("T", " ")
}

function isoDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString()
  return value.includes("T") ? value : `${value.replace(" ", "T")}Z`
}
