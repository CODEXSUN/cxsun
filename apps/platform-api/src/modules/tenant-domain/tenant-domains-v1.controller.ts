import { Controller, Delete, Get, Post } from '../../core/decorators/controller.js'
import { Body, Headers, Param, Query } from '../../core/decorators/http-params.js'
import { Inject } from '../../core/decorators/inject.js'
import { UseGuards } from '../../core/decorators/guards.js'
import { AuthGuard } from '../.././core/guards/auth.guard.js'
import { TenantDomainService } from './tenant-domain.service.js'
import type { TenantDomainDeleteInput, TenantDomainUpsertInput } from './tenant-domain.types.js'

@Controller('api/v1/tenant-domains')
@UseGuards(AuthGuard)
export class TenantDomainsV1Controller {
  constructor(
    @Inject(TenantDomainService) private readonly tenantDomains: TenantDomainService,
  ) {}

  @Get()
  list() {
    return this.tenantDomains.list()
  }

  @Get('resolve')
  resolve(@Query('domain') domain: string | undefined, @Headers('host') host: string | string[] | undefined) {
    const fallbackHost = Array.isArray(host) ? host[0] : host
    return this.tenantDomains.resolve(domain || fallbackHost || '')
  }

  @Post('upsert')
  upsert(@Body() body: TenantDomainUpsertInput) {
    return this.tenantDomains.upsert(body)
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Body() body: TenantDomainDeleteInput | undefined) {
    return this.tenantDomains.delete(Number(id), body)
  }

  @Post(':id/delete')
  deleteViaPost(@Param('id') id: string, @Body() body: TenantDomainDeleteInput | undefined) {
    return this.tenantDomains.delete(Number(id), body)
  }
}
