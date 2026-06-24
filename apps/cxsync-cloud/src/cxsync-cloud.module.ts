import 'reflect-metadata'
import { Module } from '../../server/src/core/decorators/module.js'
import { HealthModule } from '../../server/src/core/health/health.module.js'
import { CxSyncCloudController } from './cxsync-cloud.controller.js'
import { CxSyncCloudEngine } from './engines/cxsync-cloud.engine.js'
import { CloudTenantSnapshotConnector } from './connectors/cloud-tenant-snapshot.connector.js'
import { SyncReporter } from './reporters/sync.reporter.js'
import { FleetCloneExecutor } from './fleet/fleet-clone.executor.js'
import { FleetUpgradeService } from './fleet/fleet-upgrade.service.js'
import { SqlDumpService } from './backups/sql-dump.service.js'
import { CloudDiagnosticsService } from './diagnostics/cloud-diagnostics.service.js'

@Module({
  imports: [
    HealthModule,
  ],
  providers: [
    CxSyncCloudEngine,
    CloudTenantSnapshotConnector,
    SyncReporter,
    FleetCloneExecutor,
    FleetUpgradeService,
    SqlDumpService,
    CloudDiagnosticsService,
  ],
  controllers: [CxSyncCloudController],
})
export class CxSyncCloudModule {}
