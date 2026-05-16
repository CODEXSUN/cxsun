import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../foundation/master-record/database/migrations/master-record.migration.js'
import { warehousesCommonDefinition } from './definition.js'

export function migrateWarehousesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, warehousesCommonDefinition)
}
