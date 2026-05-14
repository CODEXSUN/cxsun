import type { FastifyRequest, FastifyReply } from 'fastify'
import type { CanActivate } from '../../core/interfaces/guard.interface.js'
import { Injectable } from '../../core/decorators/injectable.js'

@Injectable()
export class SimpleGuard implements CanActivate {
  canActivate(_request: FastifyRequest, _reply: FastifyReply): boolean {
    return true
  }
}
