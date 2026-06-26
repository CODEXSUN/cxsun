import { Body, Headers, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { SiteSliderService } from '../application/site-slider.service.js'
import type { SiteSliderInput } from '../site-slider.types.js'

@Controller('api/v1/site/sliders')
export class SiteSliderController {
  constructor(@Inject(SiteSliderService) private readonly sliders: SiteSliderService) {}

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.sliders.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.sliders.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: SiteSliderInput) {
    return this.sliders.upsert(headers, body)
  }

  @Post(':idOrUuid/delete')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.sliders.destroy(headers, idOrUuid)
  }
}
