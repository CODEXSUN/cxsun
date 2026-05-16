import { Injectable } from '../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { sizesCommonDefinition } from './definition.js'

@Injectable()
export class SizesCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, sizesCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, sizesCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, sizesCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, sizesCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, sizesCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, sizesCommonDefinition, idOrUuid)
  }
}
