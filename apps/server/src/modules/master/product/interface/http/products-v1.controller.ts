import { Body, Headers, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { ProductMasterService } from '../../application/product-master.service.js'

@Controller('api/v1/products')
export class ProductsV1Controller {
  constructor(@Inject(ProductMasterService) private readonly products: ProductMasterService) {}

  @Get('definition')
  definition() {
    return this.products.definitionMetadata()
  }

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.products.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.products.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: Record<string, unknown>) {
    return this.products.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.products.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.products.restore(headers, idOrUuid)
  }
}
