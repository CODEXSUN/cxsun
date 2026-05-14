import { Body } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import { SiteService, type SiteMessageInput } from './site.service.js'

@Controller('api/site')
export class SiteController {
  constructor(
    @Inject(SiteService) private readonly siteService: SiteService,
  ) {}

  @Get()
  async getLandingContent() {
    return this.siteService.getLandingContent()
  }

  @Post('contact')
  async createMessage(@Body() body: SiteMessageInput) {
    return this.siteService.createMessage(body)
  }
}
