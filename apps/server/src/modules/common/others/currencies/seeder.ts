import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { currenciesCommonDefinition } from './definition.js'

const currenciesSeedRows = [
  { name: '-' },
]

export function seedCurrenciesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, currenciesCommonDefinition, currenciesSeedRows)
}
