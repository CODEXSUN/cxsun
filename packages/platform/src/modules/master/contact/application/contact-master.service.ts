import { Inject } from '../../../../core/decorators/inject.js'
import { Injectable } from '../../../../core/decorators/injectable.js'
import { NotFoundException } from '../../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordAggregate } from '../../../foundation/master-record/domain/aggregates/master-record.aggregate.js'
import { MasterRecordEventBus } from '../../../foundation/master-record/application/services/master-record-event-bus.js'
import { normalizeMasterInput } from '../../../foundation/master-record/application/services/master-input-normalizer.js'
import { ContactMasterRepository } from '../infrastructure/persistence/contact-master.repository.js'
import { contactMasterDefinition } from '../domain/value-objects/contact-master.definition.js'

@Injectable()
export class ContactMasterService {
  private readonly definition = contactMasterDefinition

  constructor(
    @Inject(() => TenantContextService) private readonly tenantContext: TenantContextService,
    @Inject(ContactMasterRepository) private readonly records: ContactMasterRepository,
    @Inject(MasterRecordEventBus) private readonly eventBus: MasterRecordEventBus,
  ) {}

  definitionMetadata() {
    return this.definition
  }

  async list(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return this.records.list(context)
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.find(context, idOrUuid)
    if (!record) throw new NotFoundException('Contact master record was not found.')
    return record
  }

  async nextCode(headers: TenantRequestHeaders) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    return { code: await this.records.nextCode(context) }
  }

  async upsert(headers: TenantRequestHeaders, input: Record<string, unknown>) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const idOrUuid = input.uuid ?? input.id
    const existing = idOrUuid ? await this.records.find(context, String(idOrUuid)) : null
    const code = await contactCode(
      input.code,
      existing?.code,
      () => this.records.allocateNextCode(context),
    )
    await this.records.synchronizeCode(context, code).catch(() => undefined)
    const normalizedInput = {
      ...input,
      code,
      primaryEmail: primaryEmail(input.emails),
      primaryPhone: primaryPhone(input.phones),
    }
    const payload = normalizeMasterInput(this.definition, normalizedInput)
    const record = input.id || input.uuid
      ? await this.records.update(context, String(input.uuid ?? input.id), payload, normalizedInput)
      : await this.records.insert(context, payload, normalizedInput)
    if (!record) throw new NotFoundException('Contact master record was not found.')
    const aggregate = MasterRecordAggregate.fromRecord(this.definition, record)
    await this.eventBus.publish(input.id || input.uuid ? aggregate.updatedEvent() : aggregate.createdEvent())
    return { ok: true, record }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.softDelete(context, idOrUuid)
    if (!record) return { ok: false, error: 'Contact master record was not found.' }
    await this.eventBus.publish(MasterRecordAggregate.fromRecord(this.definition, record).deletedEvent())
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const context = await this.tenantContext.resolve(headers, 'company.manage')
    const record = await this.records.restore(context, idOrUuid)
    if (!record) return { ok: false, error: 'Contact master record was not found.' }
    await this.eventBus.publish(MasterRecordAggregate.fromRecord(this.definition, record).restoredEvent())
    return { ok: true }
  }
}

async function contactCode(code: unknown, existingCode: unknown, nextCode: () => Promise<string>) {
  const currentCode = String(code ?? '').trim()
  if (currentCode) return currentCode.toUpperCase()
  const retainedCode = String(existingCode ?? '').trim()
  if (retainedCode) return retainedCode.toUpperCase()
  return nextCode()
}

function primaryEmail(value: unknown) {
  if (!Array.isArray(value)) return null

  const rows = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({ email: String(item.email ?? '').trim(), isPrimary: item.isPrimary === true || item.is_primary === true || item.isPrimary === 1 || item.is_primary === 1 }))
    .filter((item) => item.email)

  return rows.find((item) => item.isPrimary)?.email ?? rows[0]?.email ?? null
}

function primaryPhone(value: unknown) {
  if (!Array.isArray(value)) return null

  const rows = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({ phone: String(item.phoneNumber ?? item.phone_number ?? '').trim(), isPrimary: item.isPrimary === true || item.is_primary === true || item.isPrimary === 1 || item.is_primary === 1 }))
    .filter((item) => item.phone)

  return rows.find((item) => item.isPrimary)?.phone ?? rows[0]?.phone ?? null
}
