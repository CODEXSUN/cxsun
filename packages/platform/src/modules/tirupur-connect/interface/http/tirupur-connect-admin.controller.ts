import type { FastifyRequest } from 'fastify'
import { Body, Param, Query, Req } from '../../../../core/decorators/http-params.js'
import { Controller, Get, Patch, Post, Put } from '../../../../core/decorators/controller.js'
import { UseGuards } from '../../../../core/decorators/guards.js'
import { Inject } from '../../../../core/decorators/inject.js'
import { TirupurConnectAdminService } from '../../application/tirupur-connect-admin.service.js'
import { TirupurConnectFrontendContentService } from '../../application/tirupur-connect-frontend-content.service.js'
import { TirupurConnectFrontendDesignerService } from '../../application/tirupur-connect-frontend-designer.service.js'
import { TirupurConnectMediaService } from '../../application/tirupur-connect-media.service.js'
import type { BlogTaxonomyInput, ContentInput, FrontendReleaseInput, FrontendSectionInput, FrontendSectionItemInput, ListQuery, ReviewDecisionInput } from '../../domain/tirupur-connect.types.js'
import { marketplaceAdmin, TirupurConnectAdminGuard } from '../guards/tirupur-connect-admin.guard.js'

@Controller('api/v1/tirupur-connect/admin')
@UseGuards(TirupurConnectAdminGuard)
export class TirupurConnectAdminController {
  constructor(
    @Inject(TirupurConnectAdminService) private readonly admin: TirupurConnectAdminService,
    @Inject(TirupurConnectFrontendContentService) private readonly frontendContent: TirupurConnectFrontendContentService,
    @Inject(TirupurConnectFrontendDesignerService) private readonly frontendDesigner: TirupurConnectFrontendDesignerService,
    @Inject(TirupurConnectMediaService) private readonly media: TirupurConnectMediaService,
  ) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard()
  }

  @Get('submissions')
  submissions(@Query() query: ListQuery) {
    return this.admin.submissions(query)
  }

  @Get('submissions/:uuid')
  submission(@Param('uuid') uuid: string) {
    return this.admin.submission(uuid)
  }

  @Patch('submissions/:uuid/review')
  reviewSubmission(@Param('uuid') uuid: string, @Body() body: ReviewDecisionInput, @Req() request: FastifyRequest) {
    return this.admin.reviewSubmission(marketplaceAdmin(request), uuid, body)
  }

  @Get('companies')
  companies(@Query() query: ListQuery) {
    return this.admin.companies(query)
  }

  @Get('companies/:uuid')
  company(@Param('uuid') uuid: string) {
    return this.admin.company(uuid)
  }

  @Patch('companies/:uuid/status')
  companyStatus(@Param('uuid') uuid: string, @Body() body: ReviewDecisionInput, @Req() request: FastifyRequest) {
    return this.admin.updateCompanyStatus(marketplaceAdmin(request), uuid, body)
  }

  @Get('rfqs')
  rfqs(@Query() query: ListQuery) {
    return this.admin.rfqs(query)
  }

  @Get('rfqs/:uuid')
  rfq(@Param('uuid') uuid: string) {
    return this.admin.rfq(uuid)
  }

  @Patch('rfqs/:uuid/status')
  rfqStatus(@Param('uuid') uuid: string, @Body() body: ReviewDecisionInput, @Req() request: FastifyRequest) {
    return this.admin.updateRfqStatus(marketplaceAdmin(request), uuid, body)
  }

  @Get('inquiries')
  inquiries(@Query() query: ListQuery) {
    return this.admin.inquiries(query)
  }

  @Patch('inquiries/:uuid/status')
  inquiryStatus(@Param('uuid') uuid: string, @Body() body: { status?: string }, @Req() request: FastifyRequest) {
    return this.admin.updateInquiryStatus(marketplaceAdmin(request), uuid, body.status)
  }

  @Get('verifications')
  verifications(@Query() query: ListQuery) {
    return this.admin.verifications(query)
  }

  @Patch('verifications/:uuid/decision')
  verificationDecision(@Param('uuid') uuid: string, @Body() body: ReviewDecisionInput, @Req() request: FastifyRequest) {
    return this.admin.decideVerification(marketplaceAdmin(request), uuid, body)
  }

  @Post('content/:type')
  createContent(@Param('type') type: string, @Body() body: ContentInput, @Req() request: FastifyRequest) {
    return this.admin.upsertContent(marketplaceAdmin(request), type, body)
  }

  @Get('content/:type')
  content(@Param('type') type: string, @Query() query: ListQuery) {
    return this.admin.content(type, query)
  }

  @Put('content/:type/:uuid')
  updateContent(@Param('type') type: string, @Param('uuid') uuid: string, @Body() body: ContentInput, @Req() request: FastifyRequest) {
    return this.admin.upsertContent(marketplaceAdmin(request), type, { ...body, uuid })
  }

  @Get('blog/categories')
  blogCategories(@Query() query: ListQuery) {
    return this.admin.blogTaxonomy('categories', query)
  }

  @Post('blog/categories')
  saveBlogCategory(@Body() body: BlogTaxonomyInput, @Req() request: FastifyRequest) {
    return this.admin.upsertBlogTaxonomy(marketplaceAdmin(request), 'categories', body)
  }

  @Put('blog/categories/:uuid')
  updateBlogCategory(@Param('uuid') uuid: string, @Body() body: BlogTaxonomyInput, @Req() request: FastifyRequest) {
    return this.admin.upsertBlogTaxonomy(marketplaceAdmin(request), 'categories', { ...body, uuid })
  }

  @Get('blog/tags')
  blogTags(@Query() query: ListQuery) {
    return this.admin.blogTaxonomy('tags', query)
  }

  @Post('blog/tags')
  saveBlogTag(@Body() body: BlogTaxonomyInput, @Req() request: FastifyRequest) {
    return this.admin.upsertBlogTaxonomy(marketplaceAdmin(request), 'tags', body)
  }

  @Put('blog/tags/:uuid')
  updateBlogTag(@Param('uuid') uuid: string, @Body() body: BlogTaxonomyInput, @Req() request: FastifyRequest) {
    return this.admin.upsertBlogTaxonomy(marketplaceAdmin(request), 'tags', { ...body, uuid })
  }

  @Get('blog/comments')
  blogComments(@Query() query: ListQuery) {
    return this.admin.blogComments(query)
  }

  @Patch('blog/comments/:uuid/status')
  blogCommentStatus(@Param('uuid') uuid: string, @Body() body: { status?: string }, @Req() request: FastifyRequest) {
    return this.admin.updateBlogCommentStatus(marketplaceAdmin(request), uuid, body)
  }

  @Get('blog/media')
  blogMedia(@Query() query: { search?: string }) {
    return this.media.list(query)
  }

  @Post('blog/media/upload')
  uploadBlogMedia(@Body() body: { base64?: string; fileName?: string; mimeType?: string; altText?: string; caption?: string }, @Req() request: FastifyRequest) {
    return this.media.upload(marketplaceAdmin(request), body)
  }

  @Put('blog/media/:uuid')
  updateBlogMedia(@Param('uuid') uuid: string, @Body() body: { altText?: string; caption?: string }, @Req() request: FastifyRequest) {
    return this.media.update(marketplaceAdmin(request), uuid, body)
  }

  @Post('membership-plans')
  plans(@Body() body: Record<string, unknown>, @Req() request: FastifyRequest) {
    return this.admin.upsertPlan(marketplaceAdmin(request), body)
  }

  @Get('frontend-releases')
  frontendReleases(@Query() query: ListQuery & { channel?: string }) {
    return this.frontendContent.list(query)
  }

  @Post('frontend-releases')
  createFrontendRelease(@Body() body: FrontendReleaseInput, @Req() request: FastifyRequest) {
    return this.frontendContent.createDraft(marketplaceAdmin(request), body)
  }

  @Put('frontend-releases/:uuid')
  updateFrontendRelease(@Param('uuid') uuid: string, @Body() body: FrontendReleaseInput, @Req() request: FastifyRequest) {
    return this.frontendContent.updateDraft(marketplaceAdmin(request), uuid, body)
  }

  @Post('frontend-releases/:uuid/activate')
  activateFrontendRelease(@Param('uuid') uuid: string, @Req() request: FastifyRequest) {
    return this.frontendContent.activate(marketplaceAdmin(request), uuid)
  }

  @Get('frontend-designer/pages')
  frontendPages() {
    return this.frontendDesigner.pages()
  }

  @Get('frontend-designer/pages/:pageKey')
  frontendPage(@Param('pageKey') pageKey: string) {
    return this.frontendDesigner.adminPage(pageKey)
  }

  @Post('frontend-designer/sections')
  createFrontendSection(@Body() body: FrontendSectionInput, @Req() request: FastifyRequest) {
    return this.frontendDesigner.upsertSection(marketplaceAdmin(request), body)
  }

  @Put('frontend-designer/sections/:uuid')
  updateFrontendSection(@Param('uuid') uuid: string, @Body() body: FrontendSectionInput, @Req() request: FastifyRequest) {
    return this.frontendDesigner.upsertSection(marketplaceAdmin(request), { ...body, uuid })
  }

  @Post('frontend-designer/items')
  createFrontendItem(@Body() body: FrontendSectionItemInput, @Req() request: FastifyRequest) {
    return this.frontendDesigner.upsertItem(marketplaceAdmin(request), body)
  }

  @Put('frontend-designer/items/:uuid')
  updateFrontendItem(@Param('uuid') uuid: string, @Body() body: FrontendSectionItemInput, @Req() request: FastifyRequest) {
    return this.frontendDesigner.upsertItem(marketplaceAdmin(request), { ...body, uuid })
  }

  @Get('audit')
  audit(@Query() query: ListQuery) {
    return this.admin.auditLogs(query)
  }
}
