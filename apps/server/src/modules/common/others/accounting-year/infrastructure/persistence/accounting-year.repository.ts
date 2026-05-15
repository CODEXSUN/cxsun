import { Injectable } from '../../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { accountingYearCommonDefinition } from '../../domain/value-objects/accounting-year.definition.js'

@Injectable()
export class AccountingYearCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, accountingYearCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, accountingYearCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, accountingYearCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, accountingYearCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, accountingYearCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, accountingYearCommonDefinition, idOrUuid)
  }
}
