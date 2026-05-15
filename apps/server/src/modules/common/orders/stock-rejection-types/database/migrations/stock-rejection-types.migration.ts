import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { stockRejectionTypesCommonDefinition } from '../../domain/value-objects/stock-rejection-types.definition.js'

export function migrateStockRejectionTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, stockRejectionTypesCommonDefinition)
}
