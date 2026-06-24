import { randomUUID } from 'node:crypto'
import { sql } from 'kysely'
import { BadRequestException, NotFoundException } from '../../../server/src/core/exceptions/http.exception.js'
import { Inject } from '../../../server/src/core/decorators/inject.js'
import { Injectable } from '../../../server/src/core/decorators/injectable.js'
import type { Tenant } from '../../../server/src/core/tenant/domain/tenant.types.js'
import { getDatabase } from '../../../server/src/infrastructure/database/connection.js'
import { FleetCloneExecutor } from './fleet-clone.executor.js'
import type { FleetCloneEvidence, FleetTenantInventoryItem, FleetUpgradeBatch, FleetUpgradeItem, PrepareFleetBatchInput } from './fleet-upgrade.types.js'

@Injectable()
export class FleetUpgradeService {
  private readonly runningItems = new Set<string>()

  constructor(@Inject(FleetCloneExecutor) private readonly executor: FleetCloneExecutor) {}

  async inventory(): Promise<FleetTenantInventoryItem[]> {
    const tenants = await activeTenants()
    return tenants.map(toInventory)
  }

  async prepare(input: PrepareFleetBatchInput): Promise<FleetUpgradeBatch> {
    await ensureFleetTables()
    const normalized = normalizePrepareInput(input)
    const existing = await this.findByIdempotencyKey(normalized.idempotencyKey)
    if (existing) return existing

    const all = await activeTenants()
    const selected = normalized.tenantIds.length ? all.filter((tenant) => normalized.tenantIds.includes(tenant.id)) : all
    if (!selected.length) throw new BadRequestException('No active MariaDB tenants were selected for the fleet batch.')
    if (normalized.tenantIds.length && selected.length !== new Set(normalized.tenantIds).size) {
      throw new BadRequestException('One or more selected tenants are unavailable, inactive, deleted, or not MariaDB-backed.')
    }
    const canaryId = normalized.canaryTenantId ?? selected[0]!.id
    if (!selected.some((tenant) => tenant.id === canaryId)) throw new BadRequestException('The canary tenant must belong to the selected fleet.')

    const ordered = [...selected].sort((left, right) => Number(left.id !== canaryId) - Number(right.id !== canaryId) || left.code - right.code)
    const batchId = randomUUID()
    const now = sqlDate(new Date())
    const database = getDatabase()
    await sql`
      INSERT INTO cxsync_fleet_upgrade_batches
        (id, release_version, idempotency_key, strategy, status, stop_on_failure, max_parallel, canary_tenant_id, target_count, ready_count, failed_count, created_at, updated_at)
      VALUES
        (${batchId}, ${normalized.releaseVersion}, ${normalized.idempotencyKey}, 'blue-green-clone', 'prepared', 1, 1, ${canaryId}, ${ordered.length}, 0, 0, ${now}, ${now})
    `.execute(database)
    for (const [index, tenant] of ordered.entries()) {
      await sql`
        INSERT INTO cxsync_fleet_upgrade_items
          (id, batch_id, tenant_id, tenant_code, tenant_slug, tenant_name, source_database, candidate_database, sequence_no, is_canary, status, created_at, updated_at)
        VALUES
          (${randomUUID()}, ${batchId}, ${tenant.id}, ${String(tenant.code)}, ${tenant.slug}, ${tenant.name}, ${tenant.db_name}, ${candidateDatabaseName(batchId, tenant.db_name, tenant.id)}, ${index + 1}, ${tenant.id === canaryId ? 1 : 0}, 'pending', ${now}, ${now})
      `.execute(database)
    }
    return (await this.get(batchId))!
  }

  async list(): Promise<FleetUpgradeBatch[]> {
    await ensureFleetTables()
    const result = await sql<BatchRow>`SELECT * FROM cxsync_fleet_upgrade_batches ORDER BY created_at DESC LIMIT 25`.execute(getDatabase())
    return Promise.all(result.rows.map((row) => this.mapBatch(row)))
  }

  async get(id: string): Promise<FleetUpgradeBatch | null> {
    await ensureFleetTables()
    const result = await sql<BatchRow>`SELECT * FROM cxsync_fleet_upgrade_batches WHERE id = ${id} LIMIT 1`.execute(getDatabase())
    return result.rows[0] ? this.mapBatch(result.rows[0]) : null
  }

  async cloneNext(id: string): Promise<FleetUpgradeBatch> {
    if (process.env.CXSYNC_FLEET_CLONE_ENABLED !== 'true') {
      throw new BadRequestException('Fleet cloning is locked. Enable it only for an approved CXSync Cloud rehearsal window.')
    }
    const batch = await this.get(id)
    if (!batch) throw new NotFoundException('Fleet upgrade batch was not found.')
    if (batch.status === 'failed') throw new BadRequestException('Fleet batch stopped on failure. Review its evidence before creating a new batch.')
    if (batch.status === 'ready') return batch
    const next = batch.items.find((item) => item.status === 'pending')
    if (!next) return await this.refreshBatch(id)
    if (batch.items.some((item) => item.status === 'cloning')) throw new BadRequestException('A fleet tenant clone is already running.')
    if (!next.isCanary && batch.items.some((item) => item.isCanary && item.status !== 'validated')) {
      throw new BadRequestException('The canary tenant must validate before the remaining fleet can be prepared.')
    }

    await this.updateItem(next.id, 'cloning', null)
    await this.updateBatchStatus(id, 'cloning')
    this.runningItems.add(next.id)
    void this.executeClone(id, next).finally(() => this.runningItems.delete(next.id))
    return (await this.get(id))!
  }

  private async executeClone(batchId: string, item: FleetUpgradeItem) {
    try {
      const tenant = await tenantById(item.tenantId)
      if (!tenant) throw new Error('Fleet tenant disappeared from the master registry.')
      const evidence = await this.executor.cloneAndMigrate(batchId, tenant, item.candidateDatabase)
      await this.completeItem(item.id, evidence)
    } catch (error) {
      await this.updateItem(item.id, 'failed', messageOf(error))
      await this.updateBatchStatus(batchId, 'failed')
    }
    await this.refreshBatch(batchId)
  }

  private async refreshBatch(id: string) {
    const batch = await this.get(id)
    if (!batch) throw new NotFoundException('Fleet upgrade batch was not found.')
    const readyCount = batch.items.filter((item) => item.status === 'validated').length
    const failedCount = batch.items.filter((item) => item.status === 'failed').length
    const status = failedCount ? 'failed' : readyCount === batch.targetCount ? 'ready' : batch.items.some((item) => item.status === 'cloning') ? 'cloning' : 'prepared'
    await sql`
      UPDATE cxsync_fleet_upgrade_batches
      SET status = ${status}, ready_count = ${readyCount}, failed_count = ${failedCount},
          started_at = COALESCE(started_at, ${readyCount || failedCount ? sqlDate(new Date()) : null}),
          completed_at = ${status === 'ready' || status === 'failed' ? sqlDate(new Date()) : null}, updated_at = ${sqlDate(new Date())}
      WHERE id = ${id}
    `.execute(getDatabase())
    return (await this.get(id))!
  }

  private async findByIdempotencyKey(key: string) {
    const result = await sql<BatchRow>`SELECT * FROM cxsync_fleet_upgrade_batches WHERE idempotency_key = ${key} LIMIT 1`.execute(getDatabase())
    return result.rows[0] ? this.mapBatch(result.rows[0]) : null
  }

  private async mapBatch(row: BatchRow): Promise<FleetUpgradeBatch> {
    const itemsResult = await sql<ItemRow>`SELECT * FROM cxsync_fleet_upgrade_items WHERE batch_id = ${row.id} ORDER BY sequence_no`.execute(getDatabase())
    return {
      completedAt: row.completed_at ? isoDate(row.completed_at) : null,
      createdAt: isoDate(row.created_at),
      failedCount: Number(row.failed_count),
      id: row.id,
      idempotencyKey: row.idempotency_key,
      items: itemsResult.rows.map(mapItem),
      maxParallel: 1,
      readyCount: Number(row.ready_count),
      releaseVersion: row.release_version,
      startedAt: row.started_at ? isoDate(row.started_at) : null,
      status: row.status,
      stopOnFailure: true,
      strategy: 'blue-green-clone',
      targetCount: Number(row.target_count),
    }
  }

  private async updateItem(id: string, status: FleetUpgradeItem['status'], error: string | null) {
    await sql`UPDATE cxsync_fleet_upgrade_items SET status = ${status}, error_message = ${error}, updated_at = ${sqlDate(new Date())} WHERE id = ${id}`.execute(getDatabase())
  }

  private async completeItem(id: string, evidence: FleetCloneEvidence) {
    await sql`
      UPDATE cxsync_fleet_upgrade_items
      SET status = 'validated', source_schema_hash = ${evidence.sourceSchemaHash}, candidate_schema_hash = ${evidence.candidateSchemaHash},
          source_table_count = ${evidence.sourceTableCount}, candidate_table_count = ${evidence.candidateTableCount},
          exact_row_count = ${evidence.exactRowCount}, evidence_json = ${JSON.stringify(evidence)}, error_message = NULL, updated_at = ${sqlDate(new Date())}
      WHERE id = ${id}
    `.execute(getDatabase())
  }

  private async updateBatchStatus(id: string, status: FleetUpgradeBatch['status']) {
    await sql`UPDATE cxsync_fleet_upgrade_batches SET status = ${status}, started_at = COALESCE(started_at, ${sqlDate(new Date())}), updated_at = ${sqlDate(new Date())} WHERE id = ${id}`.execute(getDatabase())
  }
}

interface BatchRow {
  completed_at: Date | string | null
  created_at: Date | string
  failed_count: number
  id: string
  idempotency_key: string
  ready_count: number
  release_version: string
  started_at: Date | string | null
  status: FleetUpgradeBatch['status']
  target_count: number
}

interface ItemRow {
  batch_id: string
  candidate_database: string
  error_message: string | null
  id: string
  is_canary: number | boolean
  sequence_no: number
  source_database: string
  status: FleetUpgradeItem['status']
  tenant_code: string
  tenant_id: number
  tenant_name: string
  tenant_slug: string
}

type PrepareInput = { canaryTenantId: number | null; idempotencyKey: string; releaseVersion: string; tenantIds: number[] }

export function normalizePrepareInput(input: PrepareFleetBatchInput): PrepareInput {
  const releaseVersion = requiredString(input.releaseVersion, 'releaseVersion', 80)
  if (!/^\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?$/.test(releaseVersion)) throw new BadRequestException('releaseVersion must be a semantic version such as 1.0.127.')
  const idempotencyKey = requiredString(input.idempotencyKey, 'idempotencyKey', 120)
  const tenantIds = input.tenantIds == null ? [] : Array.isArray(input.tenantIds) ? [...new Set(input.tenantIds.map(numberId))] : invalid('tenantIds must be an array.')
  const canaryTenantId = input.canaryTenantId == null ? null : numberId(input.canaryTenantId)
  return { canaryTenantId, idempotencyKey, releaseVersion, tenantIds }
}

export function candidateDatabaseName(batchId: string, sourceDatabase: string, tenantId = 0) {
  const source = sourceDatabase.replace(/[^a-zA-Z0-9_]/g, '_')
  const prefix = `cxu_${batchId.replaceAll('-', '').slice(0, 8)}_${tenantId}_`
  return `${prefix}${source}`.slice(0, 64)
}

async function activeTenants(): Promise<Tenant[]> {
  return await getDatabase().selectFrom('tenants').selectAll().where('db_type', '=', 'mariadb').where('status', '=', 'active').where('deleted_at', 'is', null).orderBy('code').execute() as Tenant[]
}

async function tenantById(id: number): Promise<Tenant | null> {
  return await getDatabase().selectFrom('tenants').selectAll().where('id', '=', id).where('deleted_at', 'is', null).executeTakeFirst() as Tenant | undefined ?? null
}

function toInventory(tenant: Tenant): FleetTenantInventoryItem {
  return { corporateId: tenant.corporate_id ?? '', database: tenant.db_name, databaseHost: tenant.db_host, databaseType: tenant.db_type, id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status, tenantCode: String(tenant.code) }
}

function mapItem(row: ItemRow): FleetUpgradeItem {
  return { candidateDatabase: row.candidate_database, error: row.error_message, id: row.id, isCanary: Boolean(row.is_canary), sequence: Number(row.sequence_no), sourceDatabase: row.source_database, status: row.status, tenantCode: row.tenant_code, tenantId: Number(row.tenant_id), tenantName: row.tenant_name, tenantSlug: row.tenant_slug }
}

let fleetTablesReady = false
async function ensureFleetTables() {
  if (fleetTablesReady) return
  const database = getDatabase()
  await sql`CREATE TABLE IF NOT EXISTS cxsync_fleet_upgrade_batches (
    id CHAR(36) PRIMARY KEY, release_version VARCHAR(80) NOT NULL, idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    strategy VARCHAR(40) NOT NULL, status VARCHAR(32) NOT NULL, stop_on_failure TINYINT(1) NOT NULL, max_parallel INT NOT NULL,
    canary_tenant_id INT NULL, target_count INT NOT NULL, ready_count INT NOT NULL, failed_count INT NOT NULL,
    started_at DATETIME(3) NULL, completed_at DATETIME(3) NULL, created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    KEY idx_cxsync_fleet_batches_status (status, created_at)
  ) ENGINE=InnoDB`.execute(database)
  await sql`CREATE TABLE IF NOT EXISTS cxsync_fleet_upgrade_items (
    id CHAR(36) PRIMARY KEY, batch_id CHAR(36) NOT NULL, tenant_id INT NOT NULL, tenant_code VARCHAR(80) NOT NULL,
    tenant_slug VARCHAR(120) NOT NULL, tenant_name VARCHAR(191) NOT NULL, source_database VARCHAR(191) NOT NULL,
    candidate_database VARCHAR(191) NOT NULL, sequence_no INT NOT NULL, is_canary TINYINT(1) NOT NULL, status VARCHAR(32) NOT NULL,
    source_schema_hash CHAR(64) NULL, candidate_schema_hash CHAR(64) NULL, source_table_count INT NULL, candidate_table_count INT NULL,
    exact_row_count BIGINT NULL, evidence_json LONGTEXT NULL, error_message TEXT NULL, created_at DATETIME(3) NOT NULL, updated_at DATETIME(3) NOT NULL,
    UNIQUE KEY uq_cxsync_fleet_batch_tenant (batch_id, tenant_id), KEY idx_cxsync_fleet_items_status (batch_id, status, sequence_no)
  ) ENGINE=InnoDB`.execute(database)
  await sql`UPDATE cxsync_fleet_upgrade_items SET status = 'failed', error_message = 'CXSync Cloud restarted while this clone was running; inspect the retained candidate and backup before creating a new batch.', updated_at = ${sqlDate(new Date())} WHERE status = 'cloning'`.execute(database)
  await sql`UPDATE cxsync_fleet_upgrade_batches SET status = 'failed', failed_count = GREATEST(failed_count, 1), completed_at = ${sqlDate(new Date())}, updated_at = ${sqlDate(new Date())} WHERE status = 'cloning'`.execute(database)
  fleetTablesReady = true
}

function requiredString(value: unknown, field: string, max: number) {
  if (typeof value !== 'string' || !value.trim()) throw new BadRequestException(`${field} is required.`)
  return value.trim().slice(0, max)
}
function numberId(value: unknown) { const id = Number(value); if (!Number.isInteger(id) || id <= 0) throw new BadRequestException('Tenant IDs must be positive integers.'); return id }
function invalid(message: string): never { throw new BadRequestException(message) }
function messageOf(error: unknown) { return error instanceof Error ? error.message.slice(0, 2_000) : 'Fleet clone failed.' }
function sqlDate(value: Date) { return value.toISOString().slice(0, 23).replace('T', ' ') }
function isoDate(value: Date | string) { return value instanceof Date ? value.toISOString() : value.includes('T') ? value : `${value.replace(' ', 'T')}Z` }
