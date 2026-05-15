import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterDataDefinition } from '../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { orderMasterDefinition } from '../../domain/value-objects/order-master.definition.js'

export function migrateOrderMasterTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterDataDefinition(database, orderMasterDefinition)
}
