import { HealthModule } from './health/health.module.js'
import { SiteModule } from './site/index.js'
import { Module } from '../core/decorators/module.js'

@Module({
  imports: [HealthModule, SiteModule],
})
export class AppModule {}
