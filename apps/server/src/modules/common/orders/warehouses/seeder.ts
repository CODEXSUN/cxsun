import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { warehousesCommonDefinition } from './definition.js'

const warehousesSeedRows = [
  { name: '-' },
]

export function seedWarehousesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, warehousesCommonDefinition, warehousesSeedRows)
}
