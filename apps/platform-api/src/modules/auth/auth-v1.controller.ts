import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Body, Headers } from '../../core/decorators/http-params.js'
import { Inject } from '../../core/decorators/inject.js'
import { AuthService } from './auth.service.js'
import type { LoginInput } from './auth.types.js'
import type { TenantRequestHeaders } from './tenant-context.service.js'

@Controller('api/v1/auth')
export class AuthV1Controller {
  constructor(
    @Inject(AuthService) private readonly authService: AuthService,
  ) {}

  @Post('login')
  login(@Body() body: LoginInput, @Headers() headers: TenantRequestHeaders) {
    return this.authService.login(body, headers)
  }

  @Get('session')
  session(@Headers() headers: TenantRequestHeaders) {
    return this.authService.session(headers)
  }
}
