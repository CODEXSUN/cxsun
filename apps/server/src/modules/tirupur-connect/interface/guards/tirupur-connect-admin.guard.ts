import type { FastifyReply, FastifyRequest } from 'fastify'
import { Injectable } from '../../../../core/decorators/injectable.js'
import type { CanActivate } from '../../../../core/interfaces/guard.interface.js'
import { verifyJwt } from '../../../../infrastructure/auth/jwt.js'
import { getDatabase } from '../../../../infrastructure/database/connection.js'
import { getTirupurConnectDatabase } from '../../infrastructure/database/tirupur-connect.connection.js'

@Injectable()
export class TirupurConnectAdminGuard implements CanActivate {
  async canActivate(request: FastifyRequest, _reply: FastifyReply) {
    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) return false
    const payload = verifyJwt(authorization.slice(7))
    if (!payload) return false

    if (payload.identitySource === 'platform') {
      const admin = await getDatabase()
        .selectFrom('admin_users')
        .select(['id', 'role', 'status'])
        .where('id', '=', payload.sub)
        .where('email', '=', payload.email)
        .executeTakeFirst()
      if (!admin || admin.status !== 'active') return false
      if (!['super-admin', 'software-admin', 'support-admin'].includes(admin.role)) return false
      ;(request as FastifyRequest & { marketplaceAdmin?: { id: number; type: string; role: string } }).marketplaceAdmin = {
        id: admin.id,
        type: 'platform',
        role: admin.role,
      }
      return true
    }

    if (payload.identitySource !== 'tirupur-connect') return false
    const account = await getTirupurConnectDatabase()
      .selectFrom('tc_accounts')
      .select(['id', 'role', 'status'])
      .where('id', '=', payload.sub)
      .where('email', '=', payload.email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!account || account.status !== 'active') return false
    if (!['marketplace-admin', 'verifier', 'content-editor'].includes(account.role)) return false
    ;(request as FastifyRequest & { marketplaceAdmin?: { id: number; type: string; role: string } }).marketplaceAdmin = {
      id: account.id,
      type: 'marketplace_account',
      role: account.role,
    }
    return true
  }
}

export function marketplaceAdmin(request: FastifyRequest) {
  return (request as FastifyRequest & { marketplaceAdmin?: { id: number; type: string; role: string } }).marketplaceAdmin!
}
