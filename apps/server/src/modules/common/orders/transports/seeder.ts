import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { transportsCommonDefinition } from './definition.js'

const transportsSeedRows = [
  { name: '-' },
]

export function seedTransportsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, transportsCommonDefinition, transportsSeedRows)
}
