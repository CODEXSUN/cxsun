import type { FastifyRequest } from 'fastify'
import { Body, Param, Req } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post, Put } from '../../../../core/decorators/controller.js'
import { UseGuards } from '../../../../core/decorators/guards.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { TirupurConnectAuthService } from '../../application/tirupur-connect-auth.service.js'
import { TirupurConnectMemberService } from '../../application/tirupur-connect-member.service.js'
import type { CompanyInput, ProductInput, QuoteInput, RfqInput, VerificationRequestInput } from '../../domain/tirupur-connect.types.js'
import { marketplaceIdentity, TirupurConnectMemberGuard } from '../guards/tirupur-connect-member.guard.js'

@Controller('api/v1/tirupur-connect/member')
@UseGuards(TirupurConnectMemberGuard)
export class TirupurConnectMemberController {
  constructor(
    @Inject(TirupurConnectAuthService) private readonly auth: TirupurConnectAuthService,
    @Inject(TirupurConnectMemberService) private readonly members: TirupurConnectMemberService,
  ) {}

  @Get('me')
  me(@Req() request: FastifyRequest) {
    return this.auth.me(marketplaceIdentity(request))
  }

  @Get('company')
  company(@Req() request: FastifyRequest) {
    return this.members.company(marketplaceIdentity(request))
  }

  @Put('company')
  upsertCompany(@Body() body: CompanyInput, @Req() request: FastifyRequest) {
    return this.members.upsertCompany(marketplaceIdentity(request), body)
  }

  @Post('company/submit')
  submitCompany(@Req() request: FastifyRequest) {
    return this.members.submitCompany(marketplaceIdentity(request))
  }

  @Get('products')
  products(@Req() request: FastifyRequest) {
    return this.members.products(marketplaceIdentity(request))
  }

  @Post('products')
  createProduct(@Body() body: ProductInput, @Req() request: FastifyRequest) {
    return this.members.upsertProduct(marketplaceIdentity(request), body)
  }

  @Put('products/:uuid')
  updateProduct(@Param('uuid') uuid: string, @Body() body: ProductInput, @Req() request: FastifyRequest) {
    return this.members.upsertProduct(marketplaceIdentity(request), { ...body, uuid })
  }

  @Get('rfqs')
  rfqs(@Req() request: FastifyRequest) {
    return this.members.rfqs(marketplaceIdentity(request))
  }

  @Post('rfqs')
  createRfq(@Body() body: RfqInput, @Req() request: FastifyRequest) {
    return this.members.upsertRfq(marketplaceIdentity(request), body)
  }

  @Put('rfqs/:uuid')
  updateRfq(@Param('uuid') uuid: string, @Body() body: RfqInput, @Req() request: FastifyRequest) {
    return this.members.upsertRfq(marketplaceIdentity(request), { ...body, uuid })
  }

  @Post('rfqs/:uuid/quotes')
  quote(@Param('uuid') uuid: string, @Body() body: QuoteInput, @Req() request: FastifyRequest) {
    return this.members.quote(marketplaceIdentity(request), uuid, body)
  }

  @Get('quotes')
  quotes(@Req() request: FastifyRequest) {
    return this.members.quotes(marketplaceIdentity(request))
  }

  @Post('verification-requests')
  verification(@Body() body: VerificationRequestInput, @Req() request: FastifyRequest) {
    return this.members.requestVerification(marketplaceIdentity(request), body)
  }

  @Post('memberships/:planUuid/select')
  membership(@Param('planUuid') planUuid: string, @Req() request: FastifyRequest) {
    return this.members.selectMembership(marketplaceIdentity(request), planUuid)
  }

  @Post('memberships/:membershipUuid/payment-order')
  membershipPayment(@Param('membershipUuid') membershipUuid: string, @Req() request: FastifyRequest) {
    return this.members.createMembershipPayment(marketplaceIdentity(request), membershipUuid)
  }

  @Post('memberships/payment-confirm')
  confirmMembershipPayment(
    @Body() body: { providerOrderId?: string; providerPaymentId?: string; providerSignature?: string },
    @Req() request: FastifyRequest,
  ) {
    return this.members.confirmMembershipPayment(marketplaceIdentity(request), body)
  }
}
