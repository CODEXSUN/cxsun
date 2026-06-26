import 'reflect-metadata'
import { Controller, Get } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { HealthService } from './health.service.js'

@Controller('health')
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  async check() {
    return this.healthService.check()
  }
}
