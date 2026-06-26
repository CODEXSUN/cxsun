import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { createPlatformEvent, PlatformEventBus } from '../../events.js'
import { platformSyncTags } from '../../sync-tags.js'
import type { IndustryUpsertInput } from './industry.types.js'
import { IndustryRepository, normalizeIndustryCode } from './industry.repository.js'

@Injectable()
export class IndustryService {
  constructor(
    @Inject(IndustryRepository) private readonly industries: IndustryRepository,
    @Inject(PlatformEventBus) private readonly events: PlatformEventBus,
  ) {}

  list() {
    return this.industries.list()
  }

  async destroy(id: number) {
    const deleted = await this.industries.softDelete(id)
    if (!deleted) return { ok: false, error: 'Industry was not found.' }

    await this.events.publish(createPlatformEvent({
      type: 'platform.industry.suspended',
      payload: { id },
      sync: platformSyncTags.onlineOnly,
    }))

    return { ok: true }
  }

  async restore(id: number) {
    const restored = await this.industries.restore(id)
    if (!restored) return { ok: false, error: 'Industry was not found.' }

    await this.events.publish(createPlatformEvent({
      type: 'platform.industry.restored',
      payload: { id },
      sync: platformSyncTags.onlineOnly,
    }))

    return { ok: true }
  }

  async upsert(input: IndustryUpsertInput) {
    const code = normalizeIndustryCode(input.code)
    const name = input.name?.trim()

    if (!code) return { ok: false, error: 'Industry code is required.' }
    if (!name) return { ok: false, error: 'Industry name is required.' }
    if (await this.industries.hasCode(code, input.id)) {
      return { ok: false, error: 'Industry code is already used.' }
    }

    const industry = await this.industries.upsert({ ...input, code, name })
    await this.events.publish(createPlatformEvent({
      type: input.id ? 'platform.industry.updated' : 'platform.industry.created',
      payload: { id: industry.id, code: industry.code, name: industry.name },
      sync: platformSyncTags.onlineOnly,
    }))

    return { ok: true, industry }
  }
}
