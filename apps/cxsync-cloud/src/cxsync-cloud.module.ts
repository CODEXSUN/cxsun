import 'reflect-metadata'
import { Module } from '../../server/src/core/decorators/module.js'
import { HealthModule } from '../../server/src/core/health/health.module.js'
import { AuthModule } from '../../server/src/modules/auth/auth.module.js'
import { CxSyncModule } from '../../server/src/modules/cxsync/index.js'
import { CxSyncCloudController } from './cxsync-cloud.controller.js'
import { CxSyncCloudEngine } from './engines/cxsync-cloud.engine.js'
import { CloudTenantSnapshotConnector } from './connectors/cloud-tenant-snapshot.connector.js'
import { SyncReporter } from './reporters/sync.reporter.js'

@Module({
  imports: [
    HealthModule,
    AuthModule,
    CxSyncModule,
  ],
  providers: [
    CxSyncCloudEngine,
    CloudTenantSnapshotConnector,
    SyncReporter,
  ],
  controllers: [CxSyncCloudController],
})
export class CxSyncCloudModule {}
