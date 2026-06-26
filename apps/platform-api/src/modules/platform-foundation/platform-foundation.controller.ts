import { Body, Param, Query } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { UseGuards } from '../../core/decorators/guards.js'
import { AuthGuard } from '../../core/guards/auth.guard.js'
import { PlatformFoundationService } from './platform-foundation.service.js'
import type { AppInput, AuditEventInput, FileMetadataInput, MailRequestInput, NotificationInput, PolicyInput, ServiceTokenInput, TenantAppsInput, TenantPolicyInput } from './platform-foundation.types.js'

@Controller('api/v1')
export class PlatformFoundationController {
  constructor(@Inject(PlatformFoundationService) private readonly service: PlatformFoundationService) {}

  @Get('rbac/policies')
  @UseGuards(AuthGuard)
  listPolicies() { return this.service.listPolicies() }

  @Post('rbac/policies/upsert')
  @UseGuards(AuthGuard)
  upsertPolicy(@Body() body: PolicyInput) { return this.service.upsertPolicy(body) }

  @Get('tenants/:tenantId/rbac/policies')
  @UseGuards(AuthGuard)
  listTenantPolicies(@Param('tenantId') tenantId: string) { return this.service.listTenantPolicies(Number(tenantId)) }

  @Post('tenants/:tenantId/rbac/policies/upsert')
  @UseGuards(AuthGuard)
  upsertTenantPolicy(@Param('tenantId') tenantId: string, @Body() body: TenantPolicyInput) { return this.service.upsertTenantPolicy(Number(tenantId), body) }

  @Post('rbac/check')
  @UseGuards(AuthGuard)
  checkPolicy(@Body() body: { tenant_id?: number; role?: string; policy_code?: string }) { return this.service.checkPolicy(body) }

  @Get('tenants/:tenantId/companies')
  @UseGuards(AuthGuard)
  listCompanies(@Param('tenantId') tenantId: string) { return this.service.listCompanies(Number(tenantId)) }

  @Get('tenants/:tenantId/accounting-years')
  @UseGuards(AuthGuard)
  listAccountingYears(@Param('tenantId') tenantId: string) { return this.service.listAccountingYears(Number(tenantId)) }

  @Get('app-registry')
  @UseGuards(AuthGuard)
  listApps() { return this.service.listApps() }

  @Post('app-registry/upsert')
  @UseGuards(AuthGuard)
  upsertApp(@Body() body: AppInput) { return this.service.upsertApp(body) }

  @Get('tenants/:tenantId/apps')
  @UseGuards(AuthGuard)
  tenantApps(@Param('tenantId') tenantId: string) { return this.service.tenantApps(Number(tenantId)) }

  @Post('tenants/:tenantId/apps/upsert')
  @UseGuards(AuthGuard)
  updateTenantApps(@Param('tenantId') tenantId: string, @Body() body: TenantAppsInput) { return this.service.updateTenantApps(Number(tenantId), body) }

  @Get('service-tokens')
  @UseGuards(AuthGuard)
  listServiceTokens() { return this.service.listServiceTokens() }

  @Post('service-tokens')
  @UseGuards(AuthGuard)
  createServiceToken(@Body() body: ServiceTokenInput) { return this.service.createServiceToken(body) }

  @Post('service-tokens/verify')
  verifyServiceToken(@Body() body: { token?: string }) { return this.service.verifyServiceToken(body) }

  @Get('audit-events')
  @UseGuards(AuthGuard)
  listAuditEvents(@Query('limit') limit?: string) { return this.service.listAuditEvents(Number(limit)) }

  @Post('audit-events')
  @UseGuards(AuthGuard)
  createAuditEvent(@Body() body: AuditEventInput) { return this.service.createAuditEvent(body) }

  @Get('notifications')
  @UseGuards(AuthGuard)
  listNotifications(@Query('limit') limit?: string) { return this.service.listNotifications(Number(limit)) }

  @Post('notifications')
  @UseGuards(AuthGuard)
  createNotification(@Body() body: NotificationInput) { return this.service.createNotification(body) }

  @Get('mail-requests')
  @UseGuards(AuthGuard)
  listMailRequests(@Query('limit') limit?: string) { return this.service.listMailRequests(Number(limit)) }

  @Post('mail-requests')
  @UseGuards(AuthGuard)
  createMailRequest(@Body() body: MailRequestInput) { return this.service.createMailRequest(body) }

  @Get('files')
  @UseGuards(AuthGuard)
  listFiles(@Query('limit') limit?: string) { return this.service.listFiles(Number(limit)) }

  @Post('files')
  @UseGuards(AuthGuard)
  createFileMetadata(@Body() body: FileMetadataInput) { return this.service.createFileMetadata(body) }

  @Post('outbox/process')
  @UseGuards(AuthGuard)
  processQueue(@Body() body: { limit?: number }) { return this.service.processQueue(body.limit) }
}
