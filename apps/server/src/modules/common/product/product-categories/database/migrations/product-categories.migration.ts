import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { productCategoriesCommonDefinition } from '../../domain/value-objects/product-categories.definition.js'

export function migrateProductCategoriesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, productCategoriesCommonDefinition)
}
