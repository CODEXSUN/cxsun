import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { sizesCommonDefinition } from './definition.js'

const sizesSeedRows = [
  { name: '-' },
]

export function seedSizesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, sizesCommonDefinition, sizesSeedRows)
}
