import { Inject } from '../../../core/decorators/inject.js'
import { Injectable } from '../../../core/decorators/injectable.js'
import { BadRequestException, NotFoundException } from '../../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../../core/tenant/tenant-context.service.js'
import { ReceiptEntryRepository } from './receipt-entry.repository.js'
import type { ReceiptEntryInput } from './receipt-entry.types.js'

@Injectable()
export class ReceiptEntryService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(ReceiptEntryRepository) private readonly receipts: ReceiptEntryRepository,
  ) {}

  async list(headers: TenantRequestHeaders) {
    return this.receipts.list(await this.tenants.resolve(headers, 'company.manage'))
  }

  async get(headers: TenantRequestHeaders, idOrUuid: string) {
    const entry = await this.receipts.find(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!entry) throw new NotFoundException('Receipt not found.')
    return entry
  }

  async upsert(headers: TenantRequestHeaders, input: ReceiptEntryInput) {
    const requestedReceiptNo = String(input.receipt_no ?? '').trim()
    const isUpdate = Boolean(input.id || input.uuid)
    const entry = await this.receipts.upsert(await this.tenants.resolve(headers, 'company.manage'), input)
    const warning = !isUpdate && requestedReceiptNo && requestedReceiptNo !== entry.receipt_no
      ? `Receipt number ${requestedReceiptNo} was already used, so ${entry.receipt_no} was saved instead.`
      : undefined
    return { ok: true, entry, warning }
  }

  async destroy(headers: TenantRequestHeaders, idOrUuid: string) {
    const deleted = await this.receipts.destroy(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!deleted) throw new NotFoundException('Receipt not found.')
    return { ok: true }
  }

  async restore(headers: TenantRequestHeaders, idOrUuid: string) {
    const entry = await this.receipts.restore(await this.tenants.resolve(headers, 'company.manage'), idOrUuid)
    if (!entry) throw new NotFoundException('Receipt not found.')
    return { ok: true, entry }
  }

  async addComment(headers: TenantRequestHeaders, idOrUuid: string, body: string) {
    if (!body?.trim()) throw new BadRequestException('Comment body is required.')
    const entry = await this.receipts.addComment(await this.tenants.resolve(headers, 'company.manage'), idOrUuid, body.trim())
    if (!entry) throw new NotFoundException('Receipt not found.')
    return { ok: true, entry }
  }

  async runTool(headers: TenantRequestHeaders, idOrUuid: string, tool: string) {
    const message = tool?.trim() || 'Receipt tool action recorded'
    const entry = await this.receipts.addActivity(await this.tenants.resolve(headers, 'company.manage'), idOrUuid, 'tool', message)
    if (!entry) throw new NotFoundException('Receipt not found.')
    return { ok: true, entry }
  }
}
