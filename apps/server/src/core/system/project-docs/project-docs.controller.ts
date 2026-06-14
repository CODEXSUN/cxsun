import type { FastifyRequest } from 'fastify'

import { Controller, Get } from '../../decorators/controller.js'
import { UseGuards } from '../../decorators/guards.js'
import { Req } from '../../decorators/http-params.js'
import { ForbiddenException } from '../../exceptions/http.exception.js'
import { AuthGuard } from '../../guards/auth.guard.js'
import { Inject } from '../../decorators/inject.js'
import { ProjectDocsService } from './project-docs.service.js'

@Controller('api/system/devdocs')
@UseGuards(AuthGuard)
export class ProjectDocsController {
  constructor(
    @Inject(ProjectDocsService)
    private readonly projectDocs: ProjectDocsService,
  ) {}

  @Get('overview')
  overview(@Req() request: FastifyRequest & { user?: { role?: string } }) {
    if (request.user?.role !== 'super-admin') {
      throw new ForbiddenException('Super-admin access is required.')
    }

    return this.projectDocs.overview()
  }
}
