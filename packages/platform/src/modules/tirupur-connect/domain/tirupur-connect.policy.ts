import { BadRequestException, ForbiddenException } from '../../../core/exceptions/http.exception.js'
import type { MarketplaceIdentity, TirupurConnectAccountRole } from './tirupur-connect.types.js'

const memberRoles: TirupurConnectAccountRole[] = [
  'buyer',
  'supplier',
  'supplier-staff',
  'association',
  'advertiser',
  'event-organizer',
  'candidate',
  'content-editor',
  'verifier',
  'marketplace-admin',
]

export function assertMarketplaceRole(identity: MarketplaceIdentity, allowed: TirupurConnectAccountRole[]) {
  if (!allowed.includes(identity.role)) {
    throw new ForbiddenException(`This action requires one of these marketplace roles: ${allowed.join(', ')}.`)
  }
}

export function normalizeMarketplaceRole(value: unknown): TirupurConnectAccountRole {
  const role = String(value ?? 'buyer').trim().toLowerCase() as TirupurConnectAccountRole
  if (!memberRoles.includes(role)) throw new BadRequestException('Unsupported marketplace role.')
  if (['marketplace-admin', 'verifier', 'content-editor'].includes(role)) {
    throw new ForbiddenException('Marketplace staff roles can only be assigned by an administrator.')
  }
  return role
}
