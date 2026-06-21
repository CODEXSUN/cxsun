import { Body, Headers } from '../../../../core/decorators/http-params.js'
import { Controller, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { TirupurConnectSyncService, type SyncHeaders } from '../../application/tirupur-connect-sync.service.js'
import type { ConnectorSubmissionInput } from '../../domain/tirupur-connect.types.js'

@Controller('api/v1/tirupur-connect/sync')
export class TirupurConnectSyncController {
  constructor(@Inject(TirupurConnectSyncService) private readonly sync: TirupurConnectSyncService) {}

  @Post('submissions')
  submit(@Headers() headers: SyncHeaders, @Body() body: ConnectorSubmissionInput) {
    return this.sync.submit(headers, body)
  }
}
