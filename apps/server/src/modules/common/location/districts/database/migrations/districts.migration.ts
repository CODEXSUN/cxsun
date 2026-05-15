import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { districtsCommonDefinition } from '../../domain/value-objects/districts.definition.js'

export function migrateDistrictsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, districtsCommonDefinition)
}
