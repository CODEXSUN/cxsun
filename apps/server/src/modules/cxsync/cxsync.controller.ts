import { Headers } from '../../core/decorators/http-params.js'
import { Controller, Get } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { CxSyncService } from './cxsync.service.js'

@Controller('api/v1/cxsync')
export class CxSyncController {
  constructor(@Inject(CxSyncService) private readonly cxsync: CxSyncService) {}

  @Get('tenant-snapshot')
  tenantSnapshot(@Headers() headers: TenantRequestHeaders) {
    return this.cxsync.tenantSnapshot(headers)
  }
}
