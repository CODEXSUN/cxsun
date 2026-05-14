import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { SiteController } from './site.controller.js'
import { SiteService } from './site.service.js'

@Module({
  controllers: [SiteController],
  providers: [SiteService],
})
export class SiteModule {}
