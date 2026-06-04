import { Body, Headers, Param, Query } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Patch, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { GstComplianceService } from '../../application/gst-compliance.service.js'
import type { GstComplianceOperationInput, GstProviderSettingsInput } from '../../domain/gst-compliance.types.js'

@Controller('api/v1/gst-compliance')
export class GstComplianceV1Controller {
  constructor(@Inject(GstComplianceService) private readonly compliance: GstComplianceService) {}

  @Get('settings')
  settings(@Headers() headers: TenantRequestHeaders, @Query() query: Record<string, unknown>) {
    return this.compliance.getSettings(headers, query)
  }

  @Patch('settings')
  saveSettings(@Headers() headers: TenantRequestHeaders, @Body() body: GstProviderSettingsInput) {
    return this.compliance.saveSettings(headers, body)
  }

  @Get('operations')
  operations(@Headers() headers: TenantRequestHeaders, @Query() query: Record<string, unknown>) {
    return this.compliance.listOperations(headers, query)
  }

  @Get('documents')
  documents(@Headers() headers: TenantRequestHeaders, @Query() query: Record<string, unknown>) {
    return this.compliance.listDocuments(headers, query)
  }

  @Post('operations/:operation')
  runOperation(
    @Headers() headers: TenantRequestHeaders,
    @Param('operation') operation: string,
    @Body() body: GstComplianceOperationInput,
  ) {
    return this.compliance.runOperation(headers, operation, body)
  }
}
