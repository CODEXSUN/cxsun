import { Body, Headers, Param } from '../../core/decorators/http-params.js'
import { Controller, Get, Post } from '../../core/decorators/controller.js'
import { Inject } from '../../core/decorators/inject.js'
import type { TenantRequestHeaders } from '../../core/tenant/tenant-context.service.js'
import { AccountsService } from './accounts.service.js'
import type { AccountBookEntryInput, AccountBookType, AccountLedgerInput, AccountLedgerType } from './accounts.types.js'

@Controller('api/v1/accounts')
export class AccountsController {
  constructor(@Inject(AccountsService) private readonly accounts: AccountsService) {}

  @Get('ledgers')
  ledgers(@Headers() headers: TenantRequestHeaders) {
    return this.accounts.ledgers(headers)
  }

  @Get('ledgers/:type')
  ledgersByType(@Headers() headers: TenantRequestHeaders, @Param('type') type: AccountLedgerType) {
    return this.accounts.ledgers(headers, type)
  }

  @Post('ledgers/:type/upsert')
  upsertLedger(@Headers() headers: TenantRequestHeaders, @Param('type') type: AccountLedgerType, @Body() body: AccountLedgerInput) {
    return this.accounts.upsertLedger(headers, normalizeLedgerType(type), body)
  }

  @Get(':bookType')
  listEntries(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType) {
    return this.accounts.listEntries(headers, normalizeBookType(bookType))
  }

  @Get(':bookType/:idOrUuid')
  getEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.getEntry(headers, normalizeBookType(bookType), idOrUuid)
  }

  @Post(':bookType/upsert')
  upsertEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Body() body: AccountBookEntryInput) {
    return this.accounts.upsertEntry(headers, normalizeBookType(bookType), body)
  }

  @Post(':bookType/:idOrUuid/destroy')
  destroyEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.destroyEntry(headers, normalizeBookType(bookType), idOrUuid)
  }

  @Post(':bookType/:idOrUuid/restore')
  restoreEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string) {
    return this.accounts.restoreEntry(headers, normalizeBookType(bookType), idOrUuid)
  }

  @Post(':bookType/:idOrUuid/comment')
  commentEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string, @Body() body: { body?: string }) {
    return this.accounts.comment(headers, normalizeBookType(bookType), idOrUuid, body)
  }

  @Post(':bookType/:idOrUuid/tool')
  toolEntry(@Headers() headers: TenantRequestHeaders, @Param('bookType') bookType: AccountBookType, @Param('idOrUuid') idOrUuid: string, @Body() body: { tool?: string }) {
    return this.accounts.tool(headers, normalizeBookType(bookType), idOrUuid, body)
  }
}

function normalizeBookType(value: string): AccountBookType {
  return value === 'bank-book' || value === 'bank' ? 'bank' : 'cash'
}

function normalizeLedgerType(value: string): AccountLedgerType {
  if (value === 'bank') return 'bank'
  if (value === 'fixed_asset' || value === 'fixed-assets') return 'fixed_asset'
  return 'cash'
}
