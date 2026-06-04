import { Inject } from '../../core/decorators/inject.js'
import { Injectable } from '../../core/decorators/injectable.js'
import { NotFoundException } from '../../core/exceptions/http.exception.js'
import { TenantContextService, type TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { AccountsRepository } from './accounts.repository.js'
import type { AccountBookEntryInput, AccountBookType, AccountLedgerInput, AccountLedgerType } from './accounts.types.js'

@Injectable()
export class AccountsService {
  constructor(
    @Inject(TenantContextService) private readonly tenants: TenantContextService,
    @Inject(AccountsRepository) private readonly accounts: AccountsRepository,
  ) {}

  async ledgers(headers: TenantRequestHeaders, type?: AccountLedgerType) {
    return this.accounts.ledgers(await this.context(headers), type)
  }

  async upsertLedger(headers: TenantRequestHeaders, type: AccountLedgerType, input: AccountLedgerInput) {
    return { ok: true, ledger: await this.accounts.upsertLedger(await this.context(headers), type, input) }
  }

  async listEntries(headers: TenantRequestHeaders, bookType: AccountBookType) {
    return this.accounts.listEntries(await this.context(headers), bookType)
  }

  async getEntry(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string) {
    const entry = await this.accounts.findEntry(await this.context(headers), bookType, idOrUuid)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return entry
  }

  async upsertEntry(headers: TenantRequestHeaders, bookType: AccountBookType, input: AccountBookEntryInput) {
    return { ok: true, entry: await this.accounts.upsertEntry(await this.context(headers), bookType, input) }
  }

  async destroyEntry(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string) {
    const deleted = await this.accounts.destroyEntry(await this.context(headers), bookType, idOrUuid)
    if (!deleted) throw new NotFoundException('Account entry not found.')
    return { ok: true }
  }

  async restoreEntry(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string) {
    const entry = await this.accounts.restoreEntry(await this.context(headers), bookType, idOrUuid)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return { ok: true, entry }
  }

  async comment(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string, body: { body?: string }) {
    const text = String(body.body ?? '').trim()
    if (!text) return this.getEntry(headers, bookType, idOrUuid)
    const entry = await this.accounts.addComment(await this.context(headers), bookType, idOrUuid, text)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return { ok: true, entry }
  }

  async tool(headers: TenantRequestHeaders, bookType: AccountBookType, idOrUuid: string, body: { tool?: string }) {
    const tool = String(body.tool ?? 'tool').trim() || 'tool'
    const entry = await this.accounts.addActivity(await this.context(headers), bookType, idOrUuid, 'tool', `${tool} requested`)
    if (!entry) throw new NotFoundException('Account entry not found.')
    return { ok: true, entry }
  }

  private context(headers: TenantRequestHeaders) {
    return this.tenants.resolve(headers, 'company.manage')
  }
}
