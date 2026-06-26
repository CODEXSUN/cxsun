import type { FastifyReply, FastifyRequest } from 'fastify'
import { Injectable } from '../../../../core/decorators/injectable.js'
import type { CanActivate } from '../../../../core/interfaces/guard.interface.js'
import { verifyJwt } from '../../../../infrastructure/auth/jwt.js'
import { getTirupurConnectDatabase } from '../../infrastructure/database/tirupur-connect.connection.js'
import type { MarketplaceIdentity } from '../../domain/tirupur-connect.types.js'

@Injectable()
export class TirupurConnectMemberGuard implements CanActivate {
  async canActivate(request: FastifyRequest, _reply: FastifyReply) {
    const authorization = request.headers.authorization
    if (!authorization?.startsWith('Bearer ')) return false
    const payload = verifyJwt(authorization.slice(7))
    if (!payload || payload.identitySource !== 'tirupur-connect') return false

    const account = await getTirupurConnectDatabase()
      .selectFrom('tc_accounts')
      .select(['id', 'uuid', 'email', 'role', 'status', 'updated_at'])
      .where('id', '=', payload.sub)
      .where('email', '=', payload.email)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()
    if (!account || account.status !== 'active' || account.role !== payload.role) return false

    const company = await getTirupurConnectDatabase()
      .selectFrom('tc_companies')
      .select('id')
      .where('account_id', '=', account.id)
      .where('deleted_at', 'is', null)
      .executeTakeFirst()

    ;(request as FastifyRequest & { marketplaceIdentity?: MarketplaceIdentity }).marketplaceIdentity = {
      accountId: account.id,
      accountUuid: account.uuid,
      email: account.email,
      role: account.role as MarketplaceIdentity['role'],
      companyId: company?.id ?? null,
    }
    return true
  }
}

export function marketplaceIdentity(request: FastifyRequest) {
  return (request as FastifyRequest & { marketplaceIdentity?: MarketplaceIdentity }).marketplaceIdentity!
}
