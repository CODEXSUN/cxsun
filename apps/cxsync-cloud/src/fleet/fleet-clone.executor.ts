import { createHash } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import mysql, { type Connection, type RowDataPacket } from 'mysql2/promise'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import type { Tenant } from '../../../server/src/core/tenant/domain/tenant.types.js'
import { dbConfig } from '../../../server/src/framework/config/index.js'
import { closeTenantDatabase, provisionTenantDatabase } from '../../../server/src/infrastructure/tenant-database/tenant-database.connection.js'
import type { FleetCloneEvidence } from './fleet-upgrade.types.js'

@Injectable()
export class FleetCloneExecutor {
  async cloneAndMigrate(batchId: string, tenant: Tenant, candidateDatabase: string): Promise<FleetCloneEvidence> {
    if (process.env.CXSYNC_FLEET_CLONE_ENABLED !== 'true') {
      throw new Error('Fleet cloning is disabled. Set CXSYNC_FLEET_CLONE_ENABLED=true only in the CXSync Cloud execution environment.')
    }
    if (process.env.CXSYNC_FLEET_SOURCE_QUIESCED !== 'true') {
      throw new Error('Fleet cloning requires CXSYNC_FLEET_SOURCE_QUIESCED=true after tenant writes are placed in an approved maintenance window.')
    }
    assertDatabaseName(tenant.db_name)
    assertDatabaseName(candidateDatabase)
    if (candidateDatabase === tenant.db_name) throw new Error('Candidate database must never equal the source tenant database.')

    const password = dbConfig.tenant.password(tenant.db_secret_ref)
    if (!password) throw new Error(`Tenant database credential ${tenant.db_secret_ref} is unavailable on CXSync Cloud.`)
    const dumpTool = process.env.CXSYNC_FLEET_DUMP_PATH?.trim() || 'mariadb-dump'
    const clientTool = process.env.CXSYNC_FLEET_CLIENT_PATH?.trim() || 'mariadb'
    const directory = resolve(process.cwd(), 'storage', 'cxsync', 'fleet', safeSegment(batchId), safeSegment(tenant.slug))
    await mkdir(directory, { recursive: true })
    const backupFile = resolve(directory, `${safeSegment(tenant.db_name)}.sql`)
    const root = await mysql.createConnection(connectionConfig(tenant, password))

    try {
      if (await databaseExists(root, candidateDatabase)) {
        throw new Error(`Candidate database ${candidateDatabase} already exists. CXSync will not overwrite it automatically.`)
      }
      const sourceBefore = await databaseEvidence(root, tenant.db_name, true)
      await runDump(dumpTool, backupFile, tenant, password)
      const backupStat = await stat(backupFile)
      if (!backupStat.size) throw new Error('Fleet clone backup is empty.')

      await root.query(`CREATE DATABASE \`${candidateDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
      await runRestore(clientTool, backupFile, candidateDatabase, tenant, password)
      const cloneBefore = await databaseEvidence(root, candidateDatabase, true)
      assertCloneParity(sourceBefore, cloneBefore, 'restore')

      const candidateTenant: Tenant = {
        ...tenant,
        db_name: candidateDatabase,
        slug: `${tenant.slug}__cxsync__${batchId.slice(0, 8)}`,
      }
      try {
        await provisionTenantDatabase(candidateTenant, { schemaOnly: true })
      } finally {
        await closeTenantDatabase(candidateTenant)
      }

      const candidateAfter = await databaseEvidence(root, candidateDatabase, true)
      assertRetainedRows(sourceBefore.rows, candidateAfter.rows, new Set(['db_versions']))
      return {
        backupFile,
        backupSha256: await hashFile(backupFile),
        candidateDatabase,
        candidateSchemaHash: candidateAfter.schemaHash,
        candidateTableCount: candidateAfter.tableCount,
        exactRowCount: sumRows(candidateAfter.rows),
        sourceDatabase: tenant.db_name,
        sourceSchemaHash: sourceBefore.schemaHash,
        sourceTableCount: sourceBefore.tableCount,
      }
    } finally {
      await root.end()
    }
  }
}

function connectionConfig(tenant: Tenant, password: string) {
  return { connectTimeout: 15_000, host: tenant.db_host, password, port: tenant.db_port, user: tenant.db_user }
}

async function databaseExists(connection: Connection, database: string) {
  const [rows] = await connection.execute<RowDataPacket[]>('SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ? LIMIT 1', [database])
  return rows.length > 0
}

async function databaseEvidence(connection: Connection, database: string, exactRows: boolean) {
  const [tables] = await connection.execute<RowDataPacket[]>(
    `SELECT TABLE_NAME, TABLE_TYPE, COALESCE(ENGINE, '') AS ENGINE, COALESCE(TABLE_COLLATION, '') AS TABLE_COLLATION
     FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
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
  const rows: Record<string, number> = {}
  if (exactRows) {
    for (const table of tables) {
      const name = String(table.TABLE_NAME)
      const [countRows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS count FROM \`${database}\`.\`${name.replaceAll('`', '``')}\``)
      rows[name] = Number(countRows[0]?.count ?? 0)
    }
  }
  return {
    rows,
    schemaHash: createHash('sha256').update(JSON.stringify({ columns, indexes, tables })).digest('hex'),
    tableCount: tables.length,
  }
}

function assertCloneParity(source: Awaited<ReturnType<typeof databaseEvidence>>, candidate: Awaited<ReturnType<typeof databaseEvidence>>, phase: string) {
  if (source.schemaHash !== candidate.schemaHash || source.tableCount !== candidate.tableCount) {
    throw new Error(`Fleet ${phase} verification failed: source and candidate schemas differ.`)
  }
  assertRetainedRows(source.rows, candidate.rows)
}

function assertRetainedRows(source: Record<string, number>, candidate: Record<string, number>, allowedChanges = new Set<string>()) {
  const changed = Object.entries(source).filter(([table, count]) => !allowedChanges.has(table) && candidate[table] !== count)
  if (changed.length) {
    throw new Error(`Fleet data verification failed for ${changed.length} existing table(s): ${changed.slice(0, 8).map(([table, count]) => `${table} ${count}/${candidate[table] ?? 'missing'}`).join(', ')}.`)
  }
}

async function runDump(tool: string, path: string, tenant: Tenant, password: string) {
  await new Promise<void>((resolvePromise, reject) => {
    const output = createWriteStream(path, { flags: 'wx' })
    const child = spawn(tool, [
      `--host=${tenant.db_host}`, `--port=${tenant.db_port}`, `--user=${tenant.db_user}`,
      '--single-transaction', '--quick', '--routines', '--triggers', '--events', '--hex-blob', '--default-character-set=utf8mb4', tenant.db_name,
    ], { env: { ...process.env, MYSQL_PWD: password }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let stderr = ''
    child.stdout.pipe(output)
    child.stderr.on('data', (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
    child.on('error', reject)
    output.on('error', reject)
    child.on('close', (code) => output.end(() => code === 0 ? resolvePromise() : reject(new Error(`Fleet dump failed: ${stderr.trim() || `exit ${code}`}`))))
  })
}

async function runRestore(tool: string, path: string, database: string, tenant: Tenant, password: string) {
  await new Promise<void>((resolvePromise, reject) => {
    const input = createReadStream(path)
    const child = spawn(tool, [
      `--host=${tenant.db_host}`, `--port=${tenant.db_port}`, `--user=${tenant.db_user}`, '--default-character-set=utf8mb4', database,
    ], { env: { ...process.env, MYSQL_PWD: password }, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`Fleet restore failed: ${stderr.trim() || `exit ${code}`}`)))
    input.on('error', reject)
    input.pipe(child.stdin)
  })
}

async function hashFile(path: string) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

function sumRows(rows: Record<string, number>) {
  return Object.values(rows).reduce((sum, count) => sum + count, 0)
}

function assertDatabaseName(value: string) {
  if (!/^[a-zA-Z0-9_]{1,64}$/.test(value)) throw new Error(`Unsafe MariaDB database identifier: ${value}`)
}

function safeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_') || 'fleet'
}
