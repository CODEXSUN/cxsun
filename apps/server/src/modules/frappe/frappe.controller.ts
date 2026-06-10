import { Body, Headers, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { FrappeService } from './frappe.service.js'
import type { FrappeResourcePostInput, FrappeSettingsInput, FrappeSyncJobInput } from './frappe.types.js'

@Controller('api/v1/frappe')
export class FrappeController {
  constructor(@Inject(FrappeService) private readonly frappe: FrappeService) {}

  @Get()
  workspace(@Headers() headers: TenantRequestHeaders) {
    return this.frappe.workspace(headers)
  }

  @Post('settings')
  saveSettings(@Headers() headers: TenantRequestHeaders, @Body() body: FrappeSettingsInput) {
    return this.frappe.saveSettings(headers, body)
  }

  @Post('validate-connection')
  validateConnection(@Headers() headers: TenantRequestHeaders, @Body() body: FrappeSettingsInput) {
    return this.frappe.validateConnection(headers, body)
  }

  @Post('sync-jobs')
  createSyncJob(@Headers() headers: TenantRequestHeaders, @Body() body: FrappeSyncJobInput) {
    return this.frappe.createJob(headers, body)
  }

  @Get('records')
  getRecords(@Headers() headers: TenantRequestHeaders, @Query() query: Record<string, unknown>) {
    return this.frappe.getRemoteRecords(headers, query)
  }

  @Post('records')
  postRecord(@Headers() headers: TenantRequestHeaders, @Body() body: FrappeResourcePostInput) {
    return this.frappe.postRemoteRecord(headers, body)
  }
}
