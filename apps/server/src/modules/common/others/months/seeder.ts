import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { monthsCommonDefinition } from './definition.js'

const monthsSeedRows = [
  { name: '-' },
]

export function seedMonthsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, monthsCommonDefinition, monthsSeedRows)
}
