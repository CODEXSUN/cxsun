import type { FastifyReply } from 'fastify'
import { Body, Headers, Param, Res } from '@cxsun/platform/core/decorators/http-params.js'
import { Controller, Get, Post } from '@cxsun/platform/core/decorators/controller.js'
import { Inject } from '@cxsun/platform/core/decorators/inject.js'
import type { TenantRequestHeaders } from '@cxsun/platform/core/tenant/tenant-context.service.js'
import type { CreateCorrectionCommand, ReverseDocumentCommand } from '@cxsun/platform/modules/entries/shared/entry-command.dto.js'
import { SalesEntryService } from '../../application/sales-entry.service.js'
import type { SalesEntryInput } from '../../infrastructure/persistence/sales-entry.repository.js'

@Controller('api/v1/entries/sales')
export class SalesEntryV1Controller {
  constructor(@Inject(SalesEntryService) private readonly salesEntries: SalesEntryService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.salesEntries.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.salesEntries.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: SalesEntryInput) {
    return this.salesEntries.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.salesEntries.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.salesEntries.restore(headers, idOrUuid)
  }

  @Post(':idOrUuid/correction')
  correction(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: CreateCorrectionCommand) {
    return this.salesEntries.correction(headers, idOrUuid, body ?? {})
  }

  @Post(':idOrUuid/reversal')
  reversal(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string, @Body() body: ReverseDocumentCommand) {
    return this.salesEntries.reversal(headers, idOrUuid, body ?? {})
  }

  @Post(':idOrUuid/comments')
  comment(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { body?: unknown },
  ) {
    return this.salesEntries.comment(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/tools')
  tool(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { printHtml?: unknown; tool?: unknown },
  ) {
    return this.salesEntries.tool(headers, idOrUuid, body)
  }

  @Post(':idOrUuid/pdf')
  async pdf(
    @Headers() headers: TenantRequestHeaders,
    @Param('idOrUuid') idOrUuid: string,
    @Body() body: { printHtml?: unknown },
    @Res() reply: FastifyReply,
  ) {
    const result = await this.salesEntries.pdf(headers, idOrUuid, body)
    return reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Length', result.file.length)
      .header('Content-Disposition', `attachment; filename="${result.fileName.replace(/"/g, '')}"`)
      .send(result.file)
  }
}
