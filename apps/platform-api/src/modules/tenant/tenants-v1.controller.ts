import type { FastifyRequest } from 'fastify'
import { Body, Headers, Param, Req } from '../../core/decorators/http-params.js'
import { Controller, Delete, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { UseGuards } from '../../core/decorators/guards.js'
import { AuthGuard } from '../.././core/guards/auth.guard.js'
import { ForbiddenException } from '../../core/exceptions/http.exception.js'
import { TenantService, type TenantInput } from './tenant.service.js'

@Controller('api/v1/tenants')
export class TenantsV1Controller {
  constructor(
    @Inject(TenantService) private readonly tenantService: TenantService,
  ) {}

  @Get()
  @UseGuards(AuthGuard)
  async list() {
    return this.tenantService.list()
  }

  @Get('events')
  @UseGuards(AuthGuard)
  async events() {
    return this.tenantService.events()
  }

  @Get('context')
  async context(@Headers('x-tenant-code') tenantCode?: string | string[], @Headers('host') host?: string | string[]) {
    return this.tenantService.context(tenantCode, host)
  }

  @Post('upsert')
  @UseGuards(AuthGuard)
  async upsert(@Body() body: TenantInput) {
    return this.tenantService.upsert(body)
  }

  @Get(':id/setup-status')
  @UseGuards(AuthGuard)
  async setupStatus(@Param('id') id: string) {
    return this.tenantService.setupStatus(Number(id))
  }

  @Post(':id/setup-client')
  @UseGuards(AuthGuard)
  async setupClient(@Param('id') id: string) {
    return this.tenantService.setupClient(Number(id))
  }

  @Post(':id/reset-database')
  @UseGuards(AuthGuard)
  async resetDatabase(@Param('id') id: string, @Body() body: { confirmation?: string }, @Req() request: FastifyRequest) {
    const user = (request as FastifyRequest & { user?: { role?: string } }).user
    if (user?.role !== 'super-admin') throw new ForbiddenException('Only super-admin can reset tenant databases.')
    return this.tenantService.resetDatabase(Number(id), body.confirmation ?? '')
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async softDelete(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id))
  }

  @Post(':id/destroy')
  @UseGuards(AuthGuard)
  async destroy(@Param('id') id: string) {
    return this.tenantService.softDelete(Number(id))
  }

  @Post(':id/restore')
  @UseGuards(AuthGuard)
  async restore(@Param('id') id: string) {
    return this.tenantService.restore(Number(id))
  }
}
