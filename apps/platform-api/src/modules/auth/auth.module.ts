import 'reflect-metadata'
import { Module } from '../.././core/decorators/module.js'
import { AuthRepository } from './auth.repository.js'
import { AuthService } from './auth.service.js'
import { AuthV1Controller } from './auth-v1.controller.js'
import { TenantContextService } from './tenant-context.service.js'
import { UserManagerService } from './user-manager.service.js'
import { AdminUsersV1Controller, UsersV1Controller } from './users-v1.controller.js'

@Module({
  controllers: [AuthV1Controller, UsersV1Controller, AdminUsersV1Controller],
  providers: [AuthService, UserManagerService, AuthRepository, TenantContextService],
})
export class AuthModule {}
