import { Controller, Get, Post } from '../../decorators/controller.js'
import { Inject } from '../../decorators/inject.js'
import { UseGuards } from '../../decorators/guards.js'
import { Body, Req } from '../../decorators/http-params.js'
import { ForbiddenException } from '../../exceptions/http.exception.js'
import { AuthGuard } from '../../guards/auth.guard.js'
import { AppRuntimeService } from './app-runtime.service.js'
import type { FastifyRequest } from 'fastify'

@Controller('api/system/app-runtime')
@UseGuards(AuthGuard)
export class AppRuntimeController {
  constructor(@Inject(AppRuntimeService) private readonly appRuntime: AppRuntimeService) {}

  @Get('apps')
  list(@Req() request: FastifyRequest & { user?: { role?: string } }) {
    assertSuperAdmin(request)
    return this.appRuntime.list()
  }

  @Post('start')
  start(@Body() body: { appId?: string }, @Req() request: FastifyRequest & { user?: { role?: string } }) {
    assertSuperAdmin(request)
    return this.appRuntime.start(String(body?.appId ?? ''))
  }

  @Post('stop')
  stop(@Body() body: { appId?: string }, @Req() request: FastifyRequest & { user?: { role?: string } }) {
    assertSuperAdmin(request)
    return this.appRuntime.stop(String(body?.appId ?? ''))
  }
}

function assertSuperAdmin(request: FastifyRequest & { user?: { role?: string } }) {
  if (request.user?.role !== 'super-admin') {
    throw new ForbiddenException('Only super-admin can manage runtime apps.')
  }
}
