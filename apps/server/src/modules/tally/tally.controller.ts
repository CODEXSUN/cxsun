import { Body, Headers } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { TallyService } from './tally.service.js'
import type { TallySettingsInput, TallySyncJobInput } from './tally.types.js'

@Controller('api/v1/tally')
export class TallyController {
  constructor(@Inject(TallyService) private readonly tally: TallyService) {}

  @Get()
  workspace(@Headers() headers: TenantRequestHeaders) {
    return this.tally.workspace(headers)
  }

  @Post('settings')
  saveSettings(@Headers() headers: TenantRequestHeaders, @Body() body: TallySettingsInput) {
    return this.tally.saveSettings(headers, body)
  }

  @Post('sync-jobs')
  createSyncJob(@Headers() headers: TenantRequestHeaders, @Body() body: TallySyncJobInput) {
    return this.tally.createJob(headers, body)
  }
}
