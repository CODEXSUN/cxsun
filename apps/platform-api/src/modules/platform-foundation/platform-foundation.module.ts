import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { MasterQueueService } from '../../infrastructure/queue/master-queue.service.js'
import { PlatformFoundationController } from './platform-foundation.controller.js'
import { PlatformFoundationRepository } from './platform-foundation.repository.js'
import { PlatformFoundationService } from './platform-foundation.service.js'

@Module({
  controllers: [PlatformFoundationController],
  providers: [PlatformFoundationService, PlatformFoundationRepository, MasterQueueService],
})
export class PlatformFoundationModule {}
