import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { bankNamesCommonDefinition } from './definition.js'

const bankNamesSeedRows = [
  { name: '-' },
]

export function seedBankNamesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, bankNamesCommonDefinition, bankNamesSeedRows)
}
