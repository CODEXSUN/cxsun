import 'reflect-metadata'
import { Module } from '../../decorators/module.js'
import { ProjectDocsController } from './project-docs.controller.js'
import { ProjectDocsService } from './project-docs.service.js'

@Module({
  controllers: [ProjectDocsController],
  providers: [ProjectDocsService],
})
export class ProjectDocsModule {}
