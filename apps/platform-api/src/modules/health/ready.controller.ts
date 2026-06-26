import 'reflect-metadata'
import { Controller, Get } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { HealthService } from './health.service.js'

@Controller('ready')
export class ReadyController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  async check() {
    return this.healthService.ready()
  }
}
