import { createHash } from 'node:crypto'
import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, ForbiddenException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { nowIso } from '../../../infrastructure/database/database-module.js'
import { generatePublicUuid } from '../../../shared/helpers/public-uuid.js'
import type { FrontendContentChannel, FrontendReleaseInput, ListQuery } from '../domain/tirupur-connect.types.js'
import { pagination, parseJson, text, TirupurConnectRepository } from '../infrastructure/tirupur-connect.repository.js'

type MarketplaceAdminIdentity = { id: number; type: string; role: string }

const frontendChannels: FrontendContentChannel[] = ['public-site', 'client-portal', 'admin-site']
const editorRoles = ['super-admin', 'software-admin', 'marketplace-admin', 'content-editor']
const publisherRoles = ['super-admin', 'software-admin', 'marketplace-admin']
const maximumPayloadBytes = 1024 * 1024

@Injectable()
export class TirupurConnectFrontendContentService {
  constructor(@Inject(TirupurConnectRepository) private readonly repository: TirupurConnectRepository) {}

  async active(channelValue: string) {
    const channel = normalizeChannel(channelValue)
    const release = await this.repository.database()
      .selectFrom('tc_frontend_releases')
      .select(['uuid', 'channel', 'name', 'version', 'payload', 'checksum', 'published_at'])
      .where('channel', '=', channel)
      .where('status', '=', 'published')
      .orderBy('published_at', 'desc')
      .executeTakeFirst()
    if (!release) return { channel, release: null, payload: null }
    return {
      channel: release.channel,
      release: {
        uuid: release.uuid,
        name: release.name,
        version: release.version,
        checksum: release.checksum,
        publishedAt: release.published_at,
      },
      payload: parseJson<Record<string, unknown>>(release.payload, {}),
    }
  }

  async list(query: ListQuery & { channel?: string }) {
    const { page, limit, offset } = pagination(query)
    let statement = this.repository.database().selectFrom('tc_frontend_releases').selectAll()
    if (text(query.channel)) statement = statement.where('channel', '=', normalizeChannel(query.channel))
    if (text(query.status)) statement = statement.where('status', '=', text(query.status))
    if (text(query.search)) statement = statement.where('name', 'like', `%${text(query.search)}%`)
    const records = await statement
      .orderBy('channel', 'asc')
      .orderBy('version', 'desc')
      .limit(limit)
      .offset(offset)
      .execute()
    return {
      records: records.map((record) => ({ ...record, payload: parseJson(record.payload, {}) })),
      page,
      limit,
    }
  }

  async createDraft(admin: MarketplaceAdminIdentity, input: FrontendReleaseInput) {
    assertRole(admin, editorRoles, 'Frontend content editor access is required.')
    const channel = normalizeChannel(input.channel)
    const name = text(input.name)
    if (!name) throw new BadRequestException('Release name is required.')
    const payload = normalizePayload(input.payload)
    const database = this.repository.database()
    const latest = await database.selectFrom('tc_frontend_releases')
      .select('version')
      .where('channel', '=', channel)
      .orderBy('version', 'desc')
      .executeTakeFirst()
    const version = (latest?.version ?? 0) + 1
    const serialized = stableJson(payload)
    const uuid = generatePublicUuid()
    const result = await database.insertInto('tc_frontend_releases').values({
      uuid,
      channel,
      name,
      version,
      payload: serialized,
      checksum: checksum(serialized),
      status: 'draft',
      created_by: admin.id,
      published_by: null,
      published_at: null,
    }).executeTakeFirst()
    const id = Number(result.insertId)
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'frontend_release.created',
      entityType: 'frontend_release',
      entityId: id,
      newValues: { uuid, channel, name, version, checksum: checksum(serialized) },
    })
    return this.release(uuid)
  }

  async updateDraft(admin: MarketplaceAdminIdentity, uuid: string, input: FrontendReleaseInput) {
    assertRole(admin, editorRoles, 'Frontend content editor access is required.')
    const existing = await this.find(uuid)
    if (existing.status !== 'draft') throw new BadRequestException('Published or archived releases are immutable. Create a new draft instead.')
    const name = text(input.name, existing.name)
    const payload = input.payload === undefined ? parseJson<Record<string, unknown>>(existing.payload, {}) : normalizePayload(input.payload)
    const serialized = stableJson(payload)
    await this.repository.database().updateTable('tc_frontend_releases').set({
      name,
      payload: serialized,
      checksum: checksum(serialized),
      updated_at: nowIso(),
    }).where('id', '=', existing.id).execute()
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: 'frontend_release.updated',
      entityType: 'frontend_release',
      entityId: existing.id,
      oldValues: { name: existing.name, checksum: existing.checksum },
      newValues: { name, checksum: checksum(serialized) },
    })
    return this.release(uuid)
  }

  async activate(admin: MarketplaceAdminIdentity, uuid: string) {
    assertRole(admin, publisherRoles, 'Frontend release publisher access is required.')
    const target = await this.find(uuid)
    if (target.status === 'published') return this.release(uuid)
    const database = this.repository.database()
    await database.transaction().execute(async (transaction) => {
      await transaction.updateTable('tc_frontend_releases').set({
        status: 'archived',
        updated_at: nowIso(),
      }).where('channel', '=', target.channel).where('status', '=', 'published').execute()
      await transaction.updateTable('tc_frontend_releases').set({
        status: 'published',
        published_by: admin.id,
        published_at: nowIso(),
        updated_at: nowIso(),
      }).where('id', '=', target.id).execute()
    })
    await this.repository.audit({
      actorType: admin.type,
      actorId: admin.id,
      action: target.status === 'archived' ? 'frontend_release.rolled_back' : 'frontend_release.published',
      entityType: 'frontend_release',
      entityId: target.id,
      oldValues: { status: target.status },
      newValues: { status: 'published', channel: target.channel, version: target.version },
    })
    return this.release(uuid)
  }

  private async release(uuid: string) {
    const release = await this.find(uuid)
    return { ...release, payload: parseJson<Record<string, unknown>>(release.payload, {}) }
  }

  private async find(uuid: string) {
    const release = await this.repository.database().selectFrom('tc_frontend_releases').selectAll().where('uuid', '=', uuid).executeTakeFirst()
    if (!release) throw new NotFoundException('Frontend content release was not found.')
    return release
  }
}

function normalizeChannel(value: unknown): FrontendContentChannel {
  const channel = text(value) as FrontendContentChannel
  if (!frontendChannels.includes(channel)) throw new BadRequestException(`Channel must be one of: ${frontendChannels.join(', ')}.`)
  return channel
}

function normalizePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Release payload must be a JSON object.')
  const serialized = stableJson(value)
  if (Buffer.byteLength(serialized, 'utf8') > maximumPayloadBytes) throw new BadRequestException('Release payload cannot exceed 1 MB.')
  return value as Record<string, unknown>
}

function assertRole(admin: MarketplaceAdminIdentity, roles: string[], message: string) {
  if (!roles.includes(admin.role)) throw new ForbiddenException(message)
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

function checksum(value: string) {
  return createHash('sha256').update(value).digest('hex')
}
