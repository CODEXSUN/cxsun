import 'reflect-metadata'
import { Module } from '../decorators/module.js'
import { HealthController } from './health.controller.js'
import { HealthService } from './health.service.js'
import { ReadyController } from './ready.controller.js'

@Module({
  controllers: [HealthController, ReadyController],
  providers: [HealthService],
})
export class HealthModule {}
