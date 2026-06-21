import { Module } from '../../core/decorators/module.js'
import { TirupurConnectAdminService } from './application/tirupur-connect-admin.service.js'
import { TirupurConnectAuthService } from './application/tirupur-connect-auth.service.js'
import { TirupurConnectFrontendContentService } from './application/tirupur-connect-frontend-content.service.js'
import { TirupurConnectFrontendDesignerService } from './application/tirupur-connect-frontend-designer.service.js'
import { TirupurConnectMemberService } from './application/tirupur-connect-member.service.js'
import { TirupurConnectMediaService } from './application/tirupur-connect-media.service.js'
import { TirupurConnectPublicService } from './application/tirupur-connect-public.service.js'
import { TirupurConnectSyncService } from './application/tirupur-connect-sync.service.js'
import { TirupurConnectRepository } from './infrastructure/tirupur-connect.repository.js'
import { TirupurConnectAdminGuard } from './interface/guards/tirupur-connect-admin.guard.js'
import { TirupurConnectMemberGuard } from './interface/guards/tirupur-connect-member.guard.js'
import { TirupurConnectAdminController } from './interface/http/tirupur-connect-admin.controller.js'
import { TirupurConnectMemberController } from './interface/http/tirupur-connect-member.controller.js'
import { TirupurConnectPublicController } from './interface/http/tirupur-connect-public.controller.js'
import { TirupurConnectSyncController } from './interface/http/tirupur-connect-sync.controller.js'

@Module({
  controllers: [
    TirupurConnectPublicController,
    TirupurConnectMemberController,
    TirupurConnectAdminController,
    TirupurConnectSyncController,
  ],
  providers: [
    TirupurConnectRepository,
    TirupurConnectAuthService,
    TirupurConnectFrontendContentService,
    TirupurConnectFrontendDesignerService,
    TirupurConnectPublicService,
    TirupurConnectMemberService,
    TirupurConnectMediaService,
    TirupurConnectAdminService,
    TirupurConnectSyncService,
    TirupurConnectMemberGuard,
    TirupurConnectAdminGuard,
  ],
})
export class TirupurConnectModule {}
