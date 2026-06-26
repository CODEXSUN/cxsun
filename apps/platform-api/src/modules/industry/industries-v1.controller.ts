import { Body, Param } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { UseGuards } from '../../core/decorators/guards.js'
import { AuthGuard } from '../.././core/guards/auth.guard.js'
import type { IndustryUpsertInput } from './industry.types.js'
import { IndustryService } from './industry.service.js'

@Controller('api/v1/industries')
@UseGuards(AuthGuard)
export class IndustriesV1Controller {
  constructor(
    @Inject(IndustryService) private readonly industryService: IndustryService,
  ) {}

  @Get()
  async list() {
    return this.industryService.list()
  }

  @Post('upsert')
  async upsert(@Body() body: IndustryUpsertInput) {
    return this.industryService.upsert(body)
  }

  @Post(':id/destroy')
  async destroy(@Param('id') id: string) {
    return this.industryService.destroy(Number(id))
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.industryService.restore(Number(id))
  }
}
