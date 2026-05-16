import { Injectable } from '../../../../core/decorators/injectable.js'
import type { TenantRuntimeContext } from '../../../../core/tenant/tenant-context.service.js'
import { MasterRecordRepository } from '../../../foundation/master-record/infrastructure/persistence/master-record.repository.js'
import { citiesCommonDefinition } from './definition.js'

@Injectable()
export class CitiesCommonRepository {
  private readonly records = new MasterRecordRepository()

  list(context: TenantRuntimeContext) {
    return this.records.list(context, citiesCommonDefinition)
  }

  find(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.find(context, citiesCommonDefinition, idOrUuid)
  }

  insert(context: TenantRuntimeContext, input: Record<string, unknown>) {
    return this.records.insert(context, citiesCommonDefinition, input)
  }

  update(context: TenantRuntimeContext, idOrUuid: string, input: Record<string, unknown>) {
    return this.records.update(context, citiesCommonDefinition, idOrUuid, input)
  }

  softDelete(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.softDelete(context, citiesCommonDefinition, idOrUuid)
  }

  restore(context: TenantRuntimeContext, idOrUuid: string) {
    return this.records.restore(context, citiesCommonDefinition, idOrUuid)
  }
}
