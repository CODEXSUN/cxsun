import { Body, Headers, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../../core/tenant/tenant-context.service.js'
import { OrderMasterService } from '../../application/order-master.service.js'

@Controller('api/v1/orders')
export class OrdersV1Controller {
  constructor(@Inject(OrderMasterService) private readonly orders: OrderMasterService) {}

  @Get('definition')
  definition() {
    return this.orders.definitionMetadata()
  }

  @Get()
  list(@Headers() headers: TenantRequestHeaders) {
    return this.orders.list(headers)
  }

  @Get(':idOrUuid')
  get(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.orders.get(headers, idOrUuid)
  }

  @Post('upsert')
  upsert(@Headers() headers: TenantRequestHeaders, @Body() body: Record<string, unknown>) {
    return this.orders.upsert(headers, body)
  }

  @Post(':idOrUuid/destroy')
  destroy(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.orders.destroy(headers, idOrUuid)
  }

  @Post(':idOrUuid/restore')
  restore(@Headers() headers: TenantRequestHeaders, @Param('idOrUuid') idOrUuid: string) {
    return this.orders.restore(headers, idOrUuid)
  }
}
