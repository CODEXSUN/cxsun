import type { FastifyRequest } from 'fastify'
import { Body, Headers, Req } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { UseGuards } from '../../core/decorators/guards.js'
import { Inject } from '../../core/decorators/inject.js'
import { AuthAnyGuard } from '../../core/guards/auth-any.guard.js'
import { AuthGuard } from '../../core/guards/auth.guard.js'
import { ForbiddenException } from '../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { SubscriptionService } from './subscription.service.js'
import type { SubscriptionPlanInput, TenantSubscriptionInput } from './subscription.types.js'

@Controller('/api/v1/subscriptions')
export class SubscriptionController {
  constructor(
    @Inject(SubscriptionService) private readonly subscriptions: SubscriptionService,
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
  ) {}

  @Get('catalog')
  @UseGuards(AuthGuard)
  catalog(@Req() request: FastifyRequest) {
    assertSuperAdmin(request)
    return this.subscriptions.catalog()
  }

  @Post('plans')
  @UseGuards(AuthGuard)
  upsertPlan(@Body() body: SubscriptionPlanInput, @Req() request: FastifyRequest) {
    assertSuperAdmin(request)
    return this.subscriptions.upsertPlan(body)
  }

  @Post('tenant-subscriptions')
  @UseGuards(AuthGuard)
  applyTenantSubscription(@Body() body: TenantSubscriptionInput, @Req() request: FastifyRequest) {
    assertSuperAdmin(request)
    return this.subscriptions.applyTenantSubscription(body)
  }

  @Post('razorpay/order')
  @UseGuards(AuthGuard)
  createRazorpayOrder(@Body() body: { tenant_id: number; subscription_uuid?: string; amount_paise?: number }, @Req() request: FastifyRequest) {
    assertSuperAdmin(request)
    return this.subscriptions.createRazorpayOrder(body)
  }

  @Post('razorpay/confirm')
  @UseGuards(AuthGuard)
  confirmRazorpayPayment(@Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }, @Req() request: FastifyRequest) {
    assertSuperAdmin(request)
    return this.subscriptions.confirmRazorpayPayment(body)
  }

  @Get('me/catalog')
  @UseGuards(AuthAnyGuard)
  async tenantCatalog(@Headers() headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers)
    return this.subscriptions.tenantCatalog(context.tenant.id)
  }

  @Post('me/razorpay/order')
  @UseGuards(AuthAnyGuard)
  async createTenantRazorpayOrder(
    @Body() body: { plan_uuid?: string; app_keys?: string[]; amount_paise?: number },
    @Headers() headers: TenantRequestHeaders,
  ) {
    const context = await this.tenantContext.resolve(headers)
    return this.subscriptions.createRazorpayOrder({
      tenant_id: context.tenant.id,
      plan_uuid: body.plan_uuid,
      app_keys: body.app_keys,
      amount_paise: body.amount_paise,
    })
  }

  @Post('me/razorpay/confirm')
  @UseGuards(AuthAnyGuard)
  async confirmTenantRazorpayPayment(
    @Body() body: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string },
    @Headers() headers: TenantRequestHeaders,
  ) {
    await this.tenantContext.resolve(headers)
    return this.subscriptions.confirmRazorpayPayment(body)
  }
}

function assertSuperAdmin(request: FastifyRequest) {
  const role = (request as FastifyRequest & { user?: { role?: string } }).user?.role
  if (role !== 'super-admin') {
    throw new ForbiddenException('Only super-admin can manage subscriptions and plans.')
  }
}
