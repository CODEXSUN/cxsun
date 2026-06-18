import 'reflect-metadata'
import { Module } from '../../decorators/module.js'
import { AppRuntimeController } from './app-runtime.controller.js'
import { AppRuntimeService } from './app-runtime.service.js'

@Module({
  controllers: [AppRuntimeController],
  providers: [AppRuntimeService],
})
export class AppRuntimeModule {}
