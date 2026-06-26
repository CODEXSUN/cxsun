import { Module } from '../../core/decorators/module.js'
import { TenantContextService } from '../../core/tenant/tenant-context.service.js'
import { CxSyncController } from './cxsync.controller.js'
import { CxSyncService } from './cxsync.service.js'

@Module({
  controllers: [CxSyncController],
  providers: [CxSyncService, TenantContextService],
})
export class CxSyncModule {}
