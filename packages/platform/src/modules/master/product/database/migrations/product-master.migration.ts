import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterDataDefinition } from '../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { productMasterDefinition } from '../../domain/value-objects/product-master.definition.js'

export function migrateProductMasterTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterDataDefinition(database, productMasterDefinition)
}
