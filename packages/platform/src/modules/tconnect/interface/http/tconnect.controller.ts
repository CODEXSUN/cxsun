import { Body, Headers, Param } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import type {
  TConnectBuyerCompanyInput,
  TConnectProductInput,
  TConnectPublicInquiryInput,
  TConnectRfqInput,
  TConnectSettings,
  TConnectSupplierProfileInput,
} from '../../core/tconnect.types.js'
import { TConnectService } from '../../application/tconnect.service.js'

@Controller('api/v1/tconnect')
export class TConnectController {
  constructor(@Inject(TConnectService) private readonly tConnect: TConnectService) {}

  @Get()
  overview(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.overview(headers)
  }

  @Get('public/suppliers')
  publicSuppliers() {
    return this.tConnect.publicSuppliers()
  }

  @Get('public/suppliers/:uuid')
  publicSupplier(@Param('uuid') uuid: string) {
    return this.tConnect.publicSupplier(uuid)
  }

  @Get('public/products')
  publicProducts() {
    return this.tConnect.publicProducts()
  }

  @Get('public/products/:uuidOrSlug')
  publicProduct(@Param('uuidOrSlug') uuidOrSlug: string) {
    return this.tConnect.publicProduct(uuidOrSlug)
  }

  @Get('public/rfqs')
  publicRfqs() {
    return this.tConnect.publicRfqs()
  }

  @Get('public/rfqs/:uuid')
  publicRfq(@Param('uuid') uuid: string) {
    return this.tConnect.publicRfq(uuid)
  }

  @Post('public/inquiries')
  createPublicInquiry(@Body() body: TConnectPublicInquiryInput) {
    return this.tConnect.createPublicInquiry(body)
  }

  @Post('settings')
  upsertSettings(@Headers() headers: TenantRequestHeaders, @Body() body: Partial<TConnectSettings>) {
    return this.tConnect.upsertSettings(headers, body)
  }

  @Get('suppliers')
  suppliers(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.listSuppliers(headers)
  }

  @Post('suppliers')
  createSupplier(@Headers() headers: TenantRequestHeaders, @Body() body: TConnectSupplierProfileInput) {
    return this.tConnect.createSupplier(headers, body)
  }

  @Post('suppliers/publish')
  publishSupplier(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string }) {
    return this.tConnect.publishSupplier(headers, body)
  }

  @Get('buyers')
  buyers(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.listBuyers(headers)
  }

  @Post('buyers')
  createBuyer(@Headers() headers: TenantRequestHeaders, @Body() body: TConnectBuyerCompanyInput) {
    return this.tConnect.createBuyer(headers, body)
  }

  @Get('products')
  products(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.listProducts(headers)
  }

  @Post('products')
  createProduct(@Headers() headers: TenantRequestHeaders, @Body() body: TConnectProductInput) {
    return this.tConnect.createProduct(headers, body)
  }

  @Post('products/publish')
  publishProduct(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string }) {
    return this.tConnect.publishProduct(headers, body)
  }

  @Get('publications/suppliers')
  supplierPublications(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.listSupplierPublications(headers)
  }

  @Post('publications/suppliers/review')
  reviewSupplierPublication(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string; status?: string }) {
    return this.tConnect.reviewSupplierPublication(headers, body)
  }

  @Get('publications/products')
  productPublications(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.listProductPublications(headers)
  }

  @Post('publications/products/review')
  reviewProductPublication(@Headers() headers: TenantRequestHeaders, @Body() body: { uuid?: string; status?: string }) {
    return this.tConnect.reviewProductPublication(headers, body)
  }

  @Get('rfqs')
  rfqs(@Headers() headers: TenantRequestHeaders) {
    return this.tConnect.listRfqs(headers)
  }

  @Post('rfqs')
  createRfq(@Headers() headers: TenantRequestHeaders, @Body() body: TConnectRfqInput) {
    return this.tConnect.createRfq(headers, body)
  }
}
