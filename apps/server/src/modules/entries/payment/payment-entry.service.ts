import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { PaymentEntryRepository } from './payment-entry.repository.js'
import type { PaymentEntryInput } from './payment-entry.types.js'

@Injectable()
export class PaymentEntryService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(PaymentEntryRepository) private readonly payments: PaymentEntryRepository,
  ) {}

  async list(headers: TenantRequestHeaders) {
    return this.payments.list(await this.tenants.resolve(headers, 'company.manage'))
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const entry = await this.payments.find(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!entry) throw new NotFoundException('Payment not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: PaymentEntryInput) {
    const requestedPaymentNo = String(input.payment_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    const entry = await this.payments.upsert(await this.tenants.resolve(headers, 'company.manage'), input)
    const warning = !isUpdate && requestedPaymentNo && requestedPaymentNo !== entry.payment_no
      ? `Payment number ${requestedPaymentNo} was already used, so ${entry.payment_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const deleted = await this.payments.destroy(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!deleted) throw new NotFoundException('Payment not found.')
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const entry = await this.payments.restore(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!entry) throw new NotFoundException('Payment not found.')
    return { ok: true, entry }
  }

  async addComment(headers: TenantRequestHeaders, idOrUuid: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Comment body is required.')
    const entry = await this.payments.addComment(await this.tenants.resolve(headers, 'company.manage'), idOrUuid, body.trim())
    if (!entry) throw new NotFoundException('Payment not found.')
    return { ok: true, entry }
  }

  async runTool(headers: TenantRequestHeaders, idOrUuid: string, tool: string) {
    const message = tool?.trim() || 'Payment tool action recorded'
    const entry = await this.payments.addActivity(await this.tenants.resolve(headers, 'company.manage'), idOrUuid, 'tool', message)
    if (!entry) throw new NotFoundException('Payment not found.')
    return { ok: true, entry }
  }
}
