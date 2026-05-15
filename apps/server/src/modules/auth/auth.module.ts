import 'reflect-metadata'
import { Module } from '../../core/decorators/module.js'
import { AuthService } from './application/auth.service.js'
import { UserManagerService } from './application/user-manager.service.js'
import { AuthRepository } from './infrastructure/auth.repository.js'
import { AuthV1Controller } from './interface/http/auth-v1.controller.js'
import { UsersV1Controller } from './interface/http/users-v1.controller.js'

@Module({
  controllers: [AuthV1Controller, UsersV1Controller],
  providers: [AuthService, UserManagerService, AuthRepository],
})
export class AuthModule {}
