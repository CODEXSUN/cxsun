import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { PurchaseEntryAggregate } from '../domain/aggregates/purchase-entry.aggregate.js'
import { PurchaseEntryEvent } from '../domain/events/purchase-entry.events.js'
import { PurchaseEntryRepository, type PurchaseEntryInput } from '../infrastructure/persistence/purchase-entry.repository.js'
import { PurchaseEntryEventBus } from './purchase-entry-event-bus.js'

@Injectable()
export class PurchaseEntryService {
  constructor(
    @Inject(TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(PurchaseEntryRepository) private readonly purchaseEntries: PurchaseEntryRepository,
    @Inject(PurchaseEntryEventBus) private readonly events: PurchaseEntryEventBus,
  ) {}

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.purchaseEntries.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.find(context, idOrUuid)
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: PurchaseEntryInput) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const requestedEntryNo = String(input.entry_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    const entry = input.id || input.uuid
      ? await this.purchaseEntries.update(context, String(input.uuid ?? input.id), input)
      : await this.purchaseEntries.insert(context, input)
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    const aggregate = PurchaseEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email)
    await this.events.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    const warning = !isUpdate && requestedEntryNo && requestedEntryNo !== entry.entry_no
      ? `Entry number ${requestedEntryNo} was already used, so ${entry.entry_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.softDelete(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Purchase entry was not found.' }
    await this.events.publish(PurchaseEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.restore(context, idOrUuid)
    if (!entry) return { ok: false, error: 'Purchase entry was not found.' }
    await this.events.publish(PurchaseEntryAggregate.fromEntry(entry, context.tenant.id, context.user.email).restoredEvent())
    return { ok: true }
  }

  async comment(headers: TenantRequestHeaders, idOrUuid: string, body: { body?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.addComment(context, idOrUuid, String(body.body ?? '').trim())
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    await this.events.publish(PurchaseEntryEvent('entries.purchase.commented', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, idOrUuid: string, body: { tool?: unknown }) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const entry = await this.purchaseEntries.addActivity(context, idOrUuid, 'tool', `${String(body.tool ?? 'tool')} requested`)
    if (!entry) throw new NotFoundException('Purchase entry was not found.')
    await this.events.publish(PurchaseEntryEvent('entries.purchase.tool', {
      actorEmail: context.user.email,
      entryId: entry.id,
      payload: { tool: String(body.tool ?? 'tool'), entryNo: entry.entry_no },
      tenantId: context.tenant.id,
      uuid: entry.uuid,
    }))
    return { ok: true, entry }
  }
}

