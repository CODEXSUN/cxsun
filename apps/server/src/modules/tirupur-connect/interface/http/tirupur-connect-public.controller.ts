import type { FastifyReply } from 'fastify'
import { Body, Param, Query, Res } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../../../core/decorators/controller.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { TirupurConnectAuthService } from '../../application/tirupur-connect-auth.service.js'
import { TirupurConnectFrontendContentService } from '../../application/tirupur-connect-frontend-content.service.js'
import { TirupurConnectFrontendDesignerService } from '../../application/tirupur-connect-frontend-designer.service.js'
import { TirupurConnectPublicService } from '../../application/tirupur-connect-public.service.js'
import { TirupurConnectMediaService } from '../../application/tirupur-connect-media.service.js'
import type { BlogCommentInput, InquiryInput, ListQuery, LoginAccountInput, RegisterAccountInput } from '../../domain/tirupur-connect.types.js'

@Controller('api/v1/tirupur-connect/public')
export class TirupurConnectPublicController {
  constructor(
    @Inject(TirupurConnectPublicService) private readonly publicService: TirupurConnectPublicService,
    @Inject(TirupurConnectAuthService) private readonly auth: TirupurConnectAuthService,
    @Inject(TirupurConnectFrontendContentService) private readonly frontendContent: TirupurConnectFrontendContentService,
    @Inject(TirupurConnectFrontendDesignerService) private readonly frontendDesigner: TirupurConnectFrontendDesignerService,
    @Inject(TirupurConnectMediaService) private readonly media: TirupurConnectMediaService,
  ) {}

  @Get('status')
  status() {
    return this.publicService.status()
  }

  @Post('register')
  register(@Body() body: RegisterAccountInput) {
    return this.auth.register(body)
  }

  @Post('login')
  login(@Body() body: LoginAccountInput) {
    return this.auth.login(body)
  }

  @Get('categories')
  categories() {
    return this.publicService.categories()
  }

  @Get('companies')
  companies(@Query() query: ListQuery) {
    return this.publicService.companies(query)
  }

  @Get('companies/:slugOrUuid')
  company(@Param('slugOrUuid') slugOrUuid: string) {
    return this.publicService.company(slugOrUuid)
  }

  @Get('products')
  products(@Query() query: ListQuery) {
    return this.publicService.products(query)
  }

  @Get('rfqs')
  rfqs(@Query() query: ListQuery) {
    return this.publicService.rfqs(query)
  }

  @Get('events')
  events(@Query() query: ListQuery) {
    return this.publicService.content('event', query)
  }

  @Get('jobs')
  jobs(@Query() query: ListQuery) {
    return this.publicService.content('job', query)
  }

  @Get('articles')
  articles(@Query() query: ListQuery) {
    return this.publicService.content('article', query)
  }

  @Get('articles/:slugOrUuid')
  article(@Param('slugOrUuid') slugOrUuid: string) {
    return this.publicService.contentItem('article', slugOrUuid)
  }

  @Get('blog/categories')
  blogCategories() {
    return this.publicService.blogTaxonomy('categories')
  }

  @Get('blog/tags')
  blogTags() {
    return this.publicService.blogTaxonomy('tags')
  }

  @Post('blog/comments')
  blogComment(@Body() body: BlogCommentInput) {
    return this.publicService.createBlogComment(body)
  }

  @Get('media/:uuid')
  async mediaContent(@Param('uuid') uuid: string, @Res() reply: FastifyReply) {
    const result = await this.media.content(uuid)
    return reply
      .header('Content-Type', String(result.asset.mime_type))
      .header('Content-Length', result.file.length)
      .header('Cache-Control', 'public, max-age=31536000, immutable')
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .send(result.file)
  }

  @Get('advertisements')
  advertisements(@Query() query: ListQuery) {
    return this.publicService.content('advertisement', query)
  }

  @Get('membership-plans')
  plans() {
    return this.publicService.plans()
  }

  @Get('frontend-content/:channel')
  frontendRelease(@Param('channel') channel: string) {
    return this.frontendContent.active(channel)
  }

  @Get('frontend-pages/:pageKey')
  frontendPage(@Param('pageKey') pageKey: string) {
    return this.frontendDesigner.publicPage(pageKey)
  }

  @Post('inquiries')
  inquiry(@Body() body: InquiryInput) {
    return this.publicService.createInquiry(body)
  }
}
