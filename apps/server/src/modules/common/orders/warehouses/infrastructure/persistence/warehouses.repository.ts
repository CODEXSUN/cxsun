import { Injectable } from '../../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { warehousesCommonDefinition } from '../../domain/value-objects/warehouses.definition.js'

@Injectable()
export class WarehousesCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, warehousesCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, warehousesCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, warehousesCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, warehousesCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, warehousesCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, warehousesCommonDefinition, idOrUuid)
  }
}
