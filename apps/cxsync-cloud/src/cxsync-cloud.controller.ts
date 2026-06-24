import { Controller, Get, Post } from '../../server/src/core/decorators/controller.js'
import { Body, Param } from '../../server/src/core/decorators/http-params.js'
import { Inject } from '../../server/src/core/decorators/inject.js'
import { CxSyncCloudEngine, type CxSyncCloudHandshakeInput } from './engines/cxsync-cloud.engine.js'
import { SyncReporter, type CxSyncReportInput } from './reporters/sync.reporter.js'
import { FleetUpgradeService } from './fleet/fleet-upgrade.service.js'
import type { PrepareFleetBatchInput } from './fleet/fleet-upgrade.types.js'
import { SqlDumpService, type SqlDumpCredentials, type SqlDumpServerCredentials } from './backups/sql-dump.service.js'
import { CloudDiagnosticsService } from './diagnostics/cloud-diagnostics.service.js'

@Controller('api/v1/cxsync-cloud')
export class CxSyncCloudController {
  constructor(
    @Inject(CxSyncCloudEngine) private readonly engine: CxSyncCloudEngine,
    @Inject(SyncReporter) private readonly reporter: SyncReporter,
    @Inject(FleetUpgradeService) private readonly fleet: FleetUpgradeService,
    @Inject(SqlDumpService) private readonly sqlDumps: SqlDumpService,
    @Inject(CloudDiagnosticsService) private readonly diagnostics: CloudDiagnosticsService,
  ) {}

  @Get('status')
  status() {
    return {
      ok: true,
      service: 'cxsync-cloud',
      status: this.engine.status(),
    }
  }

  @Get('diagnostics')
  async cloudDiagnostics() {
    return { diagnostics: await this.diagnostics.inspect(), ok: true, service: 'cxsync-cloud' }
  }

  @Get('handshake')
  async latestHandshake() {
    const handshake = await this.engine.latestHandshake()
    return {
      handshake,
      ok: true,
      service: 'cxsync-cloud',
    }
  }

  @Post('handshake')
  async recordHandshake(@Body() body: CxSyncCloudHandshakeInput) {
    const handshake = await this.engine.recordHandshake(body)
    return {
      handshake,
      ok: true,
      service: 'cxsync-cloud',
    }
  }

  @Get('tenants')
  async tenants() {
    const tenants = await this.engine.listMasterTenants()
    return {
      ok: true,
      service: 'cxsync-cloud',
      tenants,
    }
  }

  @Get('reports')
  async reports() {
    return {
      ok: true,
      reports: await this.reporter.list(),
      service: 'cxsync-cloud',
    }
  }

  @Post('reports')
  async recordReport(@Body() body: CxSyncReportInput) {
    return {
      ok: true,
      report: await this.reporter.record(body),
      service: 'cxsync-cloud',
    }
  }

  @Get('fleet/tenants')
  async fleetTenants() {
    return { ok: true, service: 'cxsync-cloud', tenants: await this.fleet.inventory() }
  }

  @Get('fleet/batches')
  async fleetBatches() {
    return {
      batches: await this.fleet.list(),
      cloneEnabled: process.env.CXSYNC_FLEET_CLONE_ENABLED === 'true' && process.env.CXSYNC_FLEET_SOURCE_QUIESCED === 'true',
      ok: true,
      service: 'cxsync-cloud',
    }
  }

  @Get('fleet/batches/:id')
  async fleetBatch(@Param('id') id: string) {
    return { batch: await this.fleet.get(id), ok: true, service: 'cxsync-cloud' }
  }

  @Post('fleet/batches')
  async prepareFleetBatch(@Body() body: PrepareFleetBatchInput) {
    return { batch: await this.fleet.prepare(body), ok: true, service: 'cxsync-cloud' }
  }

  @Post('fleet/batches/:id/clone-next')
  async cloneNextFleetTenant(@Param('id') id: string) {
    return { batch: await this.fleet.cloneNext(id), ok: true, service: 'cxsync-cloud' }
  }

  @Post('sql-dumps/tables')
  async sqlDumpTables(@Body() body: SqlDumpCredentials) {
    return { ok: true, service: 'cxsync-cloud', tables: await this.sqlDumps.tables(body) }
  }

  @Post('sql-dumps/databases')
  async sqlDumpDatabases(@Body() body: SqlDumpServerCredentials) {
    return { databases: await this.sqlDumps.databases(body), ok: true, service: 'cxsync-cloud' }
  }

  @Post('sql-dumps/jobs')
  async startSqlDump(@Body() body: { credentials: SqlDumpCredentials; folder?: string }) {
    return { job: await this.sqlDumps.start(body), ok: true, service: 'cxsync-cloud' }
  }

  @Get('sql-dumps/jobs/:id')
  sqlDumpJob(@Param('id') id: string) {
    return { job: this.sqlDumps.get(id), ok: true, service: 'cxsync-cloud' }
  }

  @Post('sql-dumps/queues')
  async startSqlDumpQueue(@Body() body: { credentials: SqlDumpServerCredentials; databases: string[]; folder?: string }) {
    return { ok: true, queue: await this.sqlDumps.startQueue(body), service: 'cxsync-cloud' }
  }

  @Get('sql-dumps/queues/:id')
  sqlDumpQueue(@Param('id') id: string) {
    return { ok: true, queue: this.sqlDumps.getQueue(id), service: 'cxsync-cloud' }
  }
}
