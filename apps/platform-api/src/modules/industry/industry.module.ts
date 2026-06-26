import 'reflect-metadata'
import { Module } from '../.././core/decorators/module.js'
import { PlatformEventBus } from '../../events.js'
import { IndustryService } from './industry.service.js'
import { IndustryRepository } from './industry.repository.js'
import { IndustriesV1Controller } from './industries-v1.controller.js'

@Module({
  controllers: [IndustriesV1Controller],
  providers: [IndustryService, IndustryRepository, PlatformEventBus],
})
export class IndustryModule {}
