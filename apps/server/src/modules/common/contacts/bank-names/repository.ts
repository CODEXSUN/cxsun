import { Injectable } from '../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { bankNamesCommonDefinition } from './definition.js'

@Injectable()
export class BankNamesCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, bankNamesCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, bankNamesCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, bankNamesCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, bankNamesCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, bankNamesCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, bankNamesCommonDefinition, idOrUuid)
  }
}
