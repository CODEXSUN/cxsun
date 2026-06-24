import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { relative, resolve, sep } from 'node:path'
import { spawn } from 'node:child_process'
import mysql, { type RowDataPacket } from 'mysql2/promise'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../server/src/core/exceptions/http.exception.js'

export type SqlDumpServerCredentials = { host: string; password: string; port: number; user: string }
export type SqlDumpCredentials = SqlDumpServerCredentials & { database: string }
export type SqlDumpDatabase = { name: string; sizeBytes: number; tableCount: number }
export type SqlDumpTable = { name: string; rows: number; sizeBytes: number }
export type SqlDumpJob = {
  completedAt: string | null
  database: string
  destination: string
  error: string | null
  fileName: string | null
  id: string
  progress: number
  sizeBytes: number
  startedAt: string
  status: 'queued' | 'running' | 'completed' | 'failed'
  tableCount: number
}
export type SqlDumpQueue = { completedCount: number; failedCount: number; id: string; items: SqlDumpJob[]; queuedCount: number; status: 'queued' | 'running' | 'completed' | 'completed-with-errors'; totalCount: number }
type TableRow = RowDataPacket & { TABLE_NAME: string; TABLE_ROWS: number | null; SIZE_BYTES: number | string | null }
type DatabaseRow = RowDataPacket & { DATABASE_NAME: string; SIZE_BYTES: number | string | null; TABLE_COUNT: number | string }

@Injectable()
export class SqlDumpService {
  private readonly jobs = new Map<string, SqlDumpJob>()
  private readonly queues = new Map<string, { id: string; itemIds: string[]; running: boolean }>()
  private readonly storageRoot = resolve(process.cwd(), 'storage', 'cxsync', 'sql-dumps')

  async databases(input: SqlDumpServerCredentials): Promise<SqlDumpDatabase[]> {
    const credentials = normalizeServerCredentials(input)
    const connection = await mysql.createConnection({ connectTimeout: 10_000, host: credentials.host, password: credentials.password, port: credentials.port, user: credentials.user })
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

  async tables(input: SqlDumpCredentials): Promise<SqlDumpTable[]> {
    const credentials = normalizeCredentials(input)
    const connection = await mysql.createConnection({ connectTimeout: 10_000, host: credentials.host, password: credentials.password, port: credentials.port, user: credentials.user })
    try {
      const [rows] = await connection.execute<TableRow[]>(
        `SELECT TABLE_NAME, TABLE_ROWS, COALESCE(DATA_LENGTH, 0) + COALESCE(INDEX_LENGTH, 0) AS SIZE_BYTES
         FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
        [credentials.database],
      )
      if (!rows.length) throw new BadRequestException('The database has no base tables or could not be found.')
      return rows.map((row) => ({ name: row.TABLE_NAME, rows: Number(row.TABLE_ROWS ?? 0), sizeBytes: Number(row.SIZE_BYTES ?? 0) }))
    } finally {
      await connection.end().catch(() => undefined)
    }
  }

  async start(input: { credentials: SqlDumpCredentials; folder?: string }): Promise<SqlDumpJob> {
    const credentials = normalizeCredentials(input?.credentials)
    const prepared = await this.prepareJob(credentials, input?.folder)
    const job = prepared.job
    job.status = 'running'
    job.progress = 1
    void this.execute(job, prepared.path, credentials, prepared.estimatedBytes)
    return { ...job }
  }

  get(id: string): SqlDumpJob {
    const job = this.jobs.get(id)
    if (!job) throw new NotFoundException('SQL dump job was not found or the service restarted.')
    return { ...job }
  }

  async startQueue(input: { credentials: SqlDumpServerCredentials; databases: string[]; folder?: string }): Promise<SqlDumpQueue> {
    const server = normalizeServerCredentials(input?.credentials)
    const selected = [...new Set((input?.databases ?? []).map((name) => normalizeDatabaseName(name)))]
    if (!selected.length) throw new BadRequestException('Select at least one database for the dump queue.')
    const prepared = []
    for (const database of selected) prepared.push(await this.prepareJob({ ...server, database }, input?.folder))
    const queue = { id: randomUUID(), itemIds: prepared.map((item) => item.job.id), running: true }
    this.queues.set(queue.id, queue)
    void this.executeQueue(queue.id, server, prepared)
    return this.getQueue(queue.id)
  }

  getQueue(id: string): SqlDumpQueue {
    const queue = this.queues.get(id)
    if (!queue) throw new NotFoundException('SQL dump queue was not found or the service restarted.')
    const items = queue.itemIds.map((itemId) => this.jobs.get(itemId)).filter((job): job is SqlDumpJob => Boolean(job)).map((job) => ({ ...job }))
    const completedCount = items.filter((item) => item.status === 'completed').length
    const failedCount = items.filter((item) => item.status === 'failed').length
    const queuedCount = items.filter((item) => item.status === 'queued').length
    const status = queue.running ? (items.some((item) => item.status === 'running') ? 'running' : 'queued') : failedCount ? 'completed-with-errors' : 'completed'
    return { completedCount, failedCount, id, items, queuedCount, status, totalCount: items.length }
  }

  private async prepareJob(credentials: SqlDumpCredentials, folder?: string) {
    const tables = await this.tables(credentials)
    const directory = this.destination(folder)
    await mkdir(directory, { recursive: true })
    const timestamp = new Date().toISOString().slice(0, 13)
    const path = resolve(directory, `${safeSegment(credentials.database)}-${timestamp}.sql`)
    const job: SqlDumpJob = { completedAt: null, database: credentials.database, destination: relative(resolve(process.cwd(), 'storage'), directory).replaceAll('\\', '/'), error: null, fileName: null, id: randomUUID(), progress: 0, sizeBytes: 0, startedAt: new Date().toISOString(), status: 'queued', tableCount: tables.length }
    this.jobs.set(job.id, job)
    return { estimatedBytes: tables.reduce((sum, table) => sum + table.sizeBytes, 0), job, path }
  }

  private async executeQueue(queueId: string, server: SqlDumpServerCredentials, prepared: Array<Awaited<ReturnType<SqlDumpService['prepareJob']>>>) {
    try {
      for (const item of prepared) {
        item.job.status = 'running'
        item.job.progress = 1
        await this.execute(item.job, item.path, { ...server, database: item.job.database }, item.estimatedBytes)
      }
    } finally {
      const queue = this.queues.get(queueId)
      if (queue) queue.running = false
    }
  }

  private destination(folder?: string) {
    const normalized = folder?.trim().replaceAll('\\', '/') || 'manual'
    if (normalized.startsWith('/') || normalized.includes('..') || !/^[A-Za-z0-9_./-]+$/.test(normalized)) {
      throw new BadRequestException('Cloud folder must be a safe relative path inside CXSync storage.')
    }
    const destination = resolve(this.storageRoot, normalized)
    if (destination !== this.storageRoot && !destination.startsWith(`${this.storageRoot}${sep}`)) throw new BadRequestException('Cloud dump destination escaped CXSync storage.')
    return destination
  }

  private async execute(job: SqlDumpJob, path: string, credentials: SqlDumpCredentials, estimatedBytes: number) {
    const partialPath = `${path}.partial`
    try {
      await new Promise<void>((resolvePromise, reject) => {
        const output = createWriteStream(partialPath, { flags: 'wx' })
        const tool = process.env.CXSYNC_FLEET_DUMP_PATH?.trim() || process.env.CXSYNC_MARIADB_DUMP_PATH?.trim() || 'mariadb-dump'
        const child = spawn(tool, dumpArguments(credentials), { env: { ...process.env, MYSQL_PWD: credentials.password }, stdio: ['ignore', 'pipe', 'pipe'] })
        let stderr = ''
        let written = 0
        child.stdout.on('data', (chunk: Buffer) => {
          written += chunk.length
          job.sizeBytes = written
          job.progress = estimatedBytes > 0 ? Math.min(95, Math.max(2, Math.round((written / estimatedBytes) * 90))) : Math.min(95, job.progress + 1)
        })
        child.stdout.pipe(output)
        child.stderr.on('data', (chunk) => { if (stderr.length < 8_000) stderr += String(chunk) })
        child.on('error', reject)
        output.on('error', reject)
        child.on('close', (code) => output.end(() => code === 0 ? resolvePromise() : reject(new Error(stderr.trim() || `Dump exited with code ${code}.`))))
      })
      const file = await stat(partialPath)
      if (!file.size) throw new Error('The SQL dump file is empty.')
      await rename(partialPath, path)
      Object.assign(job, { completedAt: new Date().toISOString(), fileName: relative(resolve(process.cwd(), 'storage'), path).replaceAll('\\', '/'), progress: 100, sizeBytes: file.size, status: 'completed' as const })
    } catch (reason) {
      await rm(partialPath, { force: true }).catch(() => undefined)
      Object.assign(job, { completedAt: new Date().toISOString(), error: messageOf(reason), progress: 100, status: 'failed' as const })
    }
  }
}

function dumpArguments(credentials: SqlDumpCredentials) {
  return [`--host=${credentials.host}`, `--port=${credentials.port}`, `--user=${credentials.user}`, '--single-transaction', '--quick', '--routines', '--triggers', '--events', '--hex-blob', '--default-character-set=utf8mb4', '--databases', credentials.database]
}

function normalizeCredentials(input: SqlDumpCredentials): SqlDumpCredentials {
  return { ...normalizeServerCredentials(input), database: normalizeDatabaseName(input?.database) }
}

function normalizeServerCredentials(input: SqlDumpServerCredentials): SqlDumpServerCredentials {
  const credentials = { host: input?.host?.trim(), password: input?.password ?? '', port: Number(input?.port), user: input?.user?.trim() }
  if (!credentials.host || !credentials.user || !credentials.password) throw new BadRequestException('Host, port, user, and password are required.')
  if (!Number.isInteger(credentials.port) || credentials.port < 1 || credentials.port > 65535) throw new BadRequestException('Database port must be between 1 and 65535.')
  return credentials
}

function normalizeDatabaseName(value: string) { const name = value?.trim(); if (!name || !/^[A-Za-z0-9_$-]+$/.test(name)) throw new BadRequestException('Database name contains unsupported characters.'); return name }

function safeSegment(value: string) { return value.replace(/[^a-zA-Z0-9_-]/g, '_') || 'database' }
function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : 'SQL dump failed.' }
