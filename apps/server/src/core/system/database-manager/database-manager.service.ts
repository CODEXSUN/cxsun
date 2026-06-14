import { spawn } from 'child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { resolve } from 'path'
import { createConnection } from 'mysql2/promise'

import { Injectable } from '../../decorators/injectable.js'
import { Inject } from '../../decorators/inject.js'
import { dbConfig } from '../../../framework/config/index.js'
import { getDatabase } from '../../../infrastructure/database/connection.js'
import { MasterQueueService } from '../../../infrastructure/queue/master-queue.service.js'

type DatabaseOperation = 'backup' | 'restore'

export interface DatabaseVersionSnapshot {
  version: string | null
  source: string | null
  installedAt: string | null
  updatedAt: string | null
  status: 'recorded' | 'not_recorded' | 'unreachable'
  error?: string
}

export interface DatabaseOperationState {
  type: DatabaseOperation
  acceptedAt: string
  target?: string
  command: string
}

@Injectable()
export class DatabaseManagerService {
  private lastOperation: DatabaseOperationState | null = null

  constructor(
    @Inject(MasterQueueService) private readonly queue: MasterQueueService,
  ) {}

  async overview() {
    const tenantRows = await getDatabase()
      .selectFrom('tenants')
      .select(['slug', 'name', 'status', 'db_host', 'db_port', 'db_name', 'db_user', 'db_secret_ref'])
      .orderBy('slug', 'asc')
      .execute()
    const [masterVersion, tenantVersions] = await Promise.all([
      this.readMasterVersion(),
      Promise.all(tenantRows.map((tenant) => this.readTenantVersion(tenant))),
    ])

    return {
      master: {
        host: dbConfig.master.host,
        port: dbConfig.master.port,
        database: dbConfig.master.database,
        user: dbConfig.master.user,
        version: masterVersion,
      },
      tenants: tenantRows.map((tenant, index) => ({
        slug: tenant.slug,
        name: tenant.name,
        status: tenant.status,
        db_host: tenant.db_host,
        db_port: tenant.db_port,
        db_name: tenant.db_name,
        db_user: tenant.db_user,
        version: tenantVersions[index],
      })),
      backups: this.listBackups(),
      lastOperation: this.lastOperation,
    }
  }

  listBackups() {
    const root = backupRoot()
    if (!existsSync(root)) return []

    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const path = resolve(root, entry.name)
        const manifestPath = resolve(path, 'manifest.json')
        const manifest = existsSync(manifestPath) ? readManifest(manifestPath) : null
        return {
          id: entry.name,
          path,
          createdAt: manifest?.createdAt ?? statSync(path).mtime.toISOString(),
          databaseCount: Array.isArray(manifest?.databases) ? manifest.databases.length : 0,
          databases: Array.isArray(manifest?.databases) ? manifest.databases.map((item: { database?: string; label?: string }) => ({ label: item.label, database: item.database })) : [],
        }
      })
      .sort((a, b) => b.id.localeCompare(a.id))
  }

  async startBackup() {
    await this.queue.enqueue({
      type: 'database.backup.manual',
      payload: { source: 'database-manager', requestedAt: new Date().toISOString() },
    })

    this.lastOperation = {
      type: 'backup',
      command: 'queue:database.backup.manual',
      acceptedAt: new Date().toISOString(),
    }

    return { accepted: true, operation: this.lastOperation }
  }

  startRestore(backupId: string) {
    const selected = backupId?.trim() || 'latest'
    return this.startOperation('restore', selected)
  }

  private startOperation(type: DatabaseOperation, target?: string) {
    const args = ['apps/cli/database-backup.mjs', type]
    if (target) args.push(target)

    const command = `${nodeCommand()} ${args.join(' ')}`
    const child = spawn(nodeCommand(), args, {
      cwd: workspaceRoot(),
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
      env: process.env,
    })
    child.unref()

    this.lastOperation = {
      type,
      target,
      command,
      acceptedAt: new Date().toISOString(),
    }

    return { accepted: true, operation: this.lastOperation }
  }

  private async readMasterVersion(): Promise<DatabaseVersionSnapshot> {
    try {
      const row = await getDatabase()
        .selectFrom('db_versions')
        .select(['version', 'source', 'installed_at', 'updated_at'])
        .where('scope', '=', 'master')
        .where('target_key', '=', dbConfig.master.database)
        .executeTakeFirst()

      return toVersionSnapshot(row)
    } catch (error) {
      return {
        version: null,
        source: null,
        installedAt: null,
        updatedAt: null,
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Master database version unavailable.',
      }
    }
  }

  private async readTenantVersion(tenant: {
    slug: string
    db_host: string
    db_port: number
    db_name: string
    db_user: string
    db_secret_ref: string
  }): Promise<DatabaseVersionSnapshot> {
    let connection: Awaited<ReturnType<typeof createConnection>> | null = null

    try {
      connection = await createConnection({
        host: tenant.db_host,
        port: tenant.db_port,
        user: tenant.db_user,
        password: dbConfig.tenant.password(tenant.db_secret_ref),
        database: tenant.db_name,
        multipleStatements: false,
        connectTimeout: dbConfig.tenant.connectTimeoutMs,
      })
      const [rows] = await connection.query(
        "SELECT version, source, installed_at, updated_at FROM db_versions WHERE scope = 'tenant' AND target_key = ? LIMIT 1",
        [tenant.slug],
      )
      const row = Array.isArray(rows) ? rows[0] : undefined
      return toVersionSnapshot(row as VersionRow | undefined)
    } catch (error) {
      return {
        version: null,
        source: null,
        installedAt: null,
        updatedAt: null,
        status: 'unreachable',
        error: error instanceof Error ? error.message : 'Tenant database version unavailable.',
      }
    } finally {
      await connection?.end()
    }
  }
}

type VersionRow = {
  version?: string | null
  source?: string | null
  installed_at?: string | Date | null
  updated_at?: string | Date | null
}

function toVersionSnapshot(row: VersionRow | undefined): DatabaseVersionSnapshot {
  if (!row?.version) {
    return {
      version: null,
      source: null,
      installedAt: null,
      updatedAt: null,
      status: 'not_recorded',
    }
  }

  return {
    version: row.version,
    source: row.source ?? null,
    installedAt: formatDatabaseDate(row.installed_at),
    updatedAt: formatDatabaseDate(row.updated_at),
    status: 'recorded',
  }
}

function formatDatabaseDate(value: string | Date | null | undefined) {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : String(value)
}

function readManifest(path: string) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return null
  }
}

function workspaceRoot() {
  return resolve(process.cwd(), process.cwd().replaceAll('\\', '/').endsWith('/apps/server') ? '../..' : '.')
}

function backupRoot() {
  return resolve(workspaceRoot(), 'storage', 'backups', 'database')
}

function nodeCommand() {
  return process.platform === 'win32' ? 'node.exe' : 'node'
}
