import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException } from '../../../core/exceptions/http.exception.js'
import { hashPassword, verifyPassword } from '../../../infrastructure/auth/password-hash.js'
import { signJwt } from '../../../infrastructure/auth/jwt.js'
import { settings } from '../../../framework/config/index.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import { normalizeMarketplaceRole } from '../domain/tirupur-connect.policy.js'
import type { LoginAccountInput, MarketplaceIdentity, RegisterAccountInput } from '../domain/tirupur-connect.types.js'
import { nullableText, slugify, text, TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'

@Injectable()
export class TirupurConnectAuthService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  async register(input: RegisterAccountInput) {
    const name = text(input.name)
    const email = text(input.email).toLowerCase()
    const password = String(input.password ?? '')
    const role = normalizeMarketplaceRole(input.role)
    if (!name || !email || !email.includes('@')) throw new BadRequestException('A valid name and email are required.')
    if (password.length < 8) throw new BadRequestException('Password must contain at least 8 characters.')
    if (await this.repository.findAccountByEmail(email)) throw new BadRequestException('An account already exists for this email.')

    const database = this.repository.database()
    const accountUuid = generatePublicUuid()
    const accountId = Number((await database.insertInto('tc_accounts').values({
      uuid: accountUuid,
      name,
      email,
      password_hash: hashPassword(password),
      phone: nullableText(input.phone),
      role,
      status: 'active',
      metadata: JSON.stringify({ registrationSource: 'web' }),
    }).executeTakeFirst()).insertId)

    let companyId: number | null = null
    if (role === 'supplier' && text(input.companyName)) {
      companyId = Number((await database.insertInto('tc_companies').values({
        uuid: generatePublicUuid(),
        account_id: accountId,
        source_type: 'web',
        name: text(input.companyName),
        slug: await this.availableCompanySlug(slugify(input.companyName)),
        email,
        phone: nullableText(input.phone),
        publication_status: 'draft',
        verification_level: 'none',
        trust_score: 0,
        membership_tier: 'free',
        created_by: accountId,
        updated_by: accountId,
      }).executeTakeFirst()).insertId)
    }

    await this.repository.audit({
      actorType: 'marketplace_account',
      actorId: accountId,
      action: 'account.registered',
      entityType: 'account',
      entityId: accountId,
      newValues: { role, companyId },
    })

    return this.session({
      accountId,
      accountUuid,
      email,
      role,
      companyId,
    })
  }

  async login(input: LoginAccountInput) {
    const email = text(input.email).toLowerCase()
    const account = await this.repository.findAccountByEmail(email)
    if (!account || account.status !== 'active' || !verifyPassword(String(input.password ?? ''), account.password_hash)) {
      throw new ForbiddenException('Invalid marketplace login details.')
    }

    const company = await this.repository.findCompanyByAccount(account.id)
    await this.repository.touchAccountLogin(account.id)
    return this.session({
      accountId: account.id,
      accountUuid: account.uuid,
      email: account.email,
      role: account.role as MarketplaceIdentity['role'],
      companyId: company?.id ?? null,
    })
  }

  async me(identity: MarketplaceIdentity) {
    const account = await this.repository.findAccountById(identity.accountId)
    if (!account) throw new ForbiddenException('Marketplace account is no longer active.')
    const company = await this.repository.findCompanyByAccount(identity.accountId)
    return {
      account: {
        uuid: account.uuid,
        name: account.name,
        email: account.email,
        phone: account.phone,
        role: account.role,
        status: account.status,
      },
      company,
    }
  }

  private session(identity: MarketplaceIdentity) {
    const expiresInSeconds = Math.max(1, settings.tirupurConnect.memberTokenHours) * 60 * 60
    const token = signJwt({
      sub: identity.accountId,
      email: identity.email,
      role: identity.role,
      tenantCode: 'tirupur-connect',
      identitySource: 'tirupur-connect',
      superAdmin: false,
    }, expiresInSeconds)

    return {
      ok: true,
      token,
      identity,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    }
  }

  private async availableCompanySlug(base: string) {
    let slug = base
    let suffix = 1
    while (await this.repository.findCompanyBySlug(slug)) {
      suffix += 1
      slug = `${base}-${suffix}`
    }
    return slug
  }
}
