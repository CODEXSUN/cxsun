import { Body, Param } from '../../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../../core/decorators/controller.js'
import { Inject } from '../../../../../core/decorators/inject.js'
import { UseGuards } from '../../../../../core/decorators/guards.js'
import { AuthGuard } from '../../../../../core/guards/auth.guard.js'
import type { ClientUpsertInput } from '../../domain/client.types.js'
import { ClientService } from '../../application/client.service.js'

@Controller('api/v1/clients')
@UseGuards(AuthGuard)
export class ClientsV1Controller {
  constructor(
    @Inject(ClientService) private readonly clientService: ClientService,
  ) {}

  @Get()
  async list() {
    return this.clientService.list()
  }

  @Post('upsert')
  async upsert(@Body() body: ClientUpsertInput) {
    return this.clientService.upsert(body)
  }

  @Post(':id/destroy')
  async destroy(@Param('id') id: string) {
    return this.clientService.destroy(Number(id))
  }

  @Post(':id/restore')
  async restore(@Param('id') id: string) {
    return this.clientService.restore(Number(id))
  }
}
