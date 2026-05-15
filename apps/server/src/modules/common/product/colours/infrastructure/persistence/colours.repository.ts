import { Injectable } from '../../../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { coloursCommonDefinition } from '../../domain/value-objects/colours.definition.js'

@Injectable()
export class ColoursCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, coloursCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, coloursCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, coloursCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, coloursCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, coloursCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, coloursCommonDefinition, idOrUuid)
  }
}
