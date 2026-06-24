import assert from 'node:assert/strict'
import { createWriteStream, createReadStream, readFileSync } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { Readable } from 'node:stream'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

loadDotEnv()

const baseUrl = (process.env.CXSYNC_CLOUD_TEST_URL || `http://127.0.0.1:${process.env.CXSYNC_CLOUD_PORT || 6077}`).replace(/\/+$/, '')
const serviceKey = required('CXSYNC_SERVICE_KEY')
const headers = { Accept: 'application/json', 'Content-Type': 'application/json', 'x-cxsync-service-key': serviceKey }
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const scratchRoot = resolve(workspaceRoot, 'tmp', 'cxsync-mirror-e2e')
const tenantSelector = process.env.CXSYNC_TEST_TENANT_CODE || process.env.CXSYNC_TEST_CORPORATE_ID || ''
const keepDatabase = process.env.CXSYNC_MIRROR_E2E_KEEP_DB === 'true'

await mkdir(scratchRoot, { recursive: true })
await assertHealth()

const tenant = await selectTenant()
const tenantCode = String(tenant.tenantCode ?? tenant.code ?? '').trim()
const corporateId = String(tenant.corporateId ?? tenant.corporate_id ?? '').trim()
assert.ok(tenantCode || corporateId, 'A tenant code or corporate ID is required for Mirror E2E.')
const localDatabase = safeDatabaseName(`cxmirror_e2e_${tenantCode || corporateId}_${Date.now().toString(36)}`)
const dumpPath = resolve(scratchRoot, `${localDatabase}.sql`)
let localConnection

try {
  const fullJob = await startAndDownloadFullDump({ corporateId, tenantCode }, dumpPath)
  await restoreDump(localDatabase, dumpPath)
  const localRows = await localEvidence(localDatabase)
  assert.deepEqual(localRows.rows, fullJob.rows, 'Restored local row counts must match Cloud full-dump evidence.')

  const incremental = await request('/api/v1/cxsync-cloud/mirror/incremental/pull', {
    body: JSON.stringify({ corporateId, cursors: {}, limit: 1, tenantCode }),
    method: 'POST',
  })
  assert.equal(incremental.ok, true)
  assert.ok(incremental.incremental.database, 'Incremental pull must include the source database name.')
  assert.ok(Array.isArray(incremental.incremental.deletes), 'Incremental pull must include a deletes array.')
  assert.ok(incremental.incremental.coverage?.deletePropagation, 'Incremental pull must report delete propagation status.')
  const upserted = await upsertIncremental(localDatabase, incremental.incremental.tables)

  console.log(JSON.stringify({
    ok: true,
    cloudDatabase: fullJob.database,
    eligibleIncrementalTables: incremental.incremental.tables.length,
    deletePropagation: incremental.incremental.coverage.deletePropagation,
    deletedRows: incremental.incremental.deletes.length,
    localDatabase,
    restoredRows: localRows.rowCount,
    restoredTables: localRows.tableCount,
    tenantCode,
    upsertedRows: upserted.rowCount,
    upsertedTables: upserted.tableCount,
  }, null, 2))
} finally {
  if (!keepDatabase) await dropDatabase(localDatabase).catch(() => undefined)
  await rm(dumpPath, { force: true }).catch(() => undefined)
  await localConnection?.end().catch(() => undefined)
}

async function assertHealth() {
  const response = await fetch(`${baseUrl}/health`)
  assert.equal(response.ok, true, `CXSync Cloud health failed at ${baseUrl}/health.`)
}

async function selectTenant() {
  const body = await request('/api/v1/cxsync-cloud/tenants')
  const tenants = body.tenants ?? []
  assert.ok(tenants.length, 'CXSync Cloud returned no active tenants.')
  if (!tenantSelector) return tenants[0]
  return tenants.find((item) => String(item.tenantCode ?? item.code ?? '') === tenantSelector || String(item.corporateId ?? item.corporate_id ?? '') === tenantSelector) ?? tenants[0]
}

async function startAndDownloadFullDump(selector, path) {
  const started = await request('/api/v1/cxsync-cloud/mirror/full-dumps', {
    body: JSON.stringify(selector),
    method: 'POST',
  })
  const job = await waitForFullDump(started.job.id)
  assert.equal(job.status, 'completed')
  assert.ok(job.tableCount > 0, 'Mirror full dump should include tables.')
  assert.ok(job.rowCount >= 0, 'Mirror full dump should include row-count evidence.')
  await download(`/api/v1/cxsync-cloud/mirror/full-dumps/${job.id}/download`, path)
  return job
}

async function waitForFullDump(id) {
  for (let attempt = 0; attempt < 360; attempt += 1) {
    const body = await request(`/api/v1/cxsync-cloud/mirror/full-dumps/${id}`)
    if (body.job.status === 'completed') return body.job
    if (body.job.status === 'failed') throw new Error(body.job.error || 'Cloud Mirror full dump failed.')
    await delay(1000)
  }
  throw new Error('Timed out waiting for Cloud Mirror full dump.')
}

async function download(path, target) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { 'x-cxsync-service-key': serviceKey } })
  assert.equal(response.ok, true, `Download failed with HTTP ${response.status}.`)
  assert.ok(response.body, 'Download response did not include a body.')
  await new Promise((resolvePromise, reject) => {
    const output = createWriteStream(target, { flags: 'wx' })
    Readable.fromWeb(response.body).on('error', reject).pipe(output)
    output.on('error', reject)
    output.on('finish', resolvePromise)
  })
}

async function restoreDump(database, path) {
  const client = await findClientTool()
  localConnection = await mysql.createConnection(localConnectionConfig())
  await localConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
  await localConnection.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await new Promise((resolvePromise, reject) => {
    const child = spawn(client, [
      `--host=${process.env.DB_HOST || '127.0.0.1'}`,
      `--port=${process.env.DB_PORT || 3306}`,
      `--user=${required('DB_USER')}`,
      '--default-character-set=utf8mb4',
      database,
    ], { env: { ...process.env, MYSQL_PWD: required('DB_PASSWORD') }, stdio: ['pipe', 'ignore', 'pipe'], windowsHide: true })
    let stderr = ''
    child.stderr.on('data', (chunk) => { if (stderr.length < 8000) stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`Local restore failed: ${stderr.trim() || `exit ${code}`}`)))
    createReadStream(path).on('error', reject).pipe(child.stdin)
  })
}

async function localEvidence(database) {
  localConnection ??= await mysql.createConnection(localConnectionConfig())
  const [tables] = await localConnection.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME",
    [database],
  )
  const rows = {}
  for (const table of tables) {
    const name = String(table.TABLE_NAME)
    const [countRows] = await localConnection.query(`SELECT COUNT(*) AS count FROM \`${database}\`.\`${name.replaceAll('`', '``')}\``)
    rows[name] = Number(countRows[0]?.count ?? 0)
  }
  return { rowCount: Object.values(rows).reduce((sum, count) => sum + count, 0), rows, tableCount: tables.length }
}

async function upsertIncremental(database, tables) {
  localConnection ??= await mysql.createConnection(localConnectionConfig())
  let tableCount = 0
  let rowCount = 0
  for (const table of tables) {
    if (!table.rows?.length) continue
    const columns = table.columns.filter((column) => Object.prototype.hasOwnProperty.call(table.rows[0] ?? {}, column))
    if (!columns.includes(table.primaryKey)) throw new Error(`Incremental table ${table.table} did not include primary key ${table.primaryKey}.`)
    const quotedColumns = columns.map(quoteIdentifier).join(', ')
    const placeholders = columns.map(() => '?').join(', ')
    const updates = columns.filter((column) => column !== table.primaryKey).map((column) => `${quoteIdentifier(column)} = VALUES(${quoteIdentifier(column)})`).join(', ') || `${quoteIdentifier(table.primaryKey)} = VALUES(${quoteIdentifier(table.primaryKey)})`
    const sql = `INSERT INTO ${quoteIdentifier(database)}.${quoteIdentifier(table.table)} (${quotedColumns}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`
    for (const row of table.rows) await localConnection.execute(sql, columns.map((column) => scalarValue(row[column])))
    tableCount += 1
    rowCount += table.rows.length
  }
  return { rowCount, tableCount }
}

async function dropDatabase(database) {
  localConnection ??= await mysql.createConnection(localConnectionConfig())
  await localConnection.query(`DROP DATABASE IF EXISTS \`${database}\``)
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...init.headers } })
  const body = await response.json().catch(() => ({}))
  assert.equal(response.ok, true, `${path} returned HTTP ${response.status}: ${JSON.stringify(body)}`)
  return body
}

async function findClientTool() {
  const explicit = process.env.CXSYNC_FLEET_CLIENT_PATH || process.env.CXSYNC_MARIADB_CLIENT_PATH
  if (explicit) return explicit
  for (const candidate of process.platform === 'win32' ? ['mariadb.exe', 'mysql.exe'] : ['mariadb', 'mysql']) {
    const found = await commandExists(candidate)
    if (found) return candidate
  }
  throw new Error('MariaDB/MySQL client was not found. Set CXSYNC_MARIADB_CLIENT_PATH for Mirror E2E.')
}

async function commandExists(command) {
  return await new Promise((resolvePromise) => {
    const child = spawn(process.platform === 'win32' ? 'where.exe' : 'command', process.platform === 'win32' ? [command] : ['-v', command], { stdio: 'ignore', windowsHide: true })
    child.on('close', (code) => resolvePromise(code === 0))
    child.on('error', () => resolvePromise(false))
  })
}

function localConnectionConfig() {
  return { connectTimeout: 15000, host: process.env.DB_HOST || '127.0.0.1', password: required('DB_PASSWORD'), port: Number(process.env.DB_PORT || 3306), user: required('DB_USER') }
}

function loadDotEnv() {
  const path = resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env')
  try {
    const text = readFileSync(path, 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const normalized = line.trim()
      if (!normalized || normalized.startsWith('#')) continue
      const separator = normalized.indexOf('=')
      if (separator <= 0) continue
      const key = normalized.slice(0, separator).trim()
      if (process.env[key] !== undefined) continue
      process.env[key] = normalized.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '')
    }
  } catch {
    // Environment variables may already be provided by the caller.
  }
}

function required(key) {
  const value = process.env[key]?.trim()
  if (!value) throw new Error(`${key} is required for Mirror E2E.`)
  return value
}

function safeDatabaseName(value) {
  const name = value.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 64)
  assert.match(name, /^cxmirror_e2e_[A-Za-z0-9_]+$/, 'Mirror E2E database must be disposable and start with cxmirror_e2e_.')
  return name
}

function quoteIdentifier(value) {
  return `\`${String(value).replaceAll('`', '``')}\``
}

function scalarValue(value) {
  if (value == null) return null
  if (value instanceof Date || Buffer.isBuffer(value)) return value
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value
  return JSON.stringify(value)
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms))
}
