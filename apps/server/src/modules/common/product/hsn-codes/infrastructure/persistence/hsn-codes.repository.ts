import { Injectable } from '../../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { hsnCodesCommonDefinition } from '../../domain/value-objects/hsn-codes.definition.js'

@Injectable()
export class HsnCodesCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, hsnCodesCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, hsnCodesCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, hsnCodesCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, hsnCodesCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, hsnCodesCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, hsnCodesCommonDefinition, idOrUuid)
  }
}
