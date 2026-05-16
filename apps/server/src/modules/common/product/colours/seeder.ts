import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { coloursCommonDefinition } from './definition.js'

const coloursSeedRows = [
  { name: '-' },
]

export function seedColoursCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, coloursCommonDefinition, coloursSeedRows)
}
