import { Injectable } from '../../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { brandsCommonDefinition } from '../../domain/value-objects/brands.definition.js'

@Injectable()
export class BrandsCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, brandsCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, brandsCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, brandsCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, brandsCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, brandsCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, brandsCommonDefinition, idOrUuid)
  }
}
