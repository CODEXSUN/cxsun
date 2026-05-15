import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { countriesCommonDefinition } from '../../domain/value-objects/countries.definition.js'

export function migrateCountriesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, countriesCommonDefinition)
}
