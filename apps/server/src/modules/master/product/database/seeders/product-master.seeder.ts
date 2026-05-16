import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { productMasterDefinition } from '../../domain/value-objects/product-master.definition.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

const productSeedRows = [
  { code: '-', name: '-', description: '-' },
]

export function seedProductMasterTable(database: TenantDatabase) {
  return seedMasterRecordDefinition(database, productMasterDefinition, productSeedRows)
}
