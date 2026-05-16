import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { orderMasterDefinition } from '../../domain/value-objects/order-master.definition.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

const orderSeedRows = [
  { code: '-', name: '-', description: '-' },
]

export function seedOrderMasterTable(database: TenantDatabase) {
  return seedMasterRecordDefinition(database, orderMasterDefinition, orderSeedRows)
}
