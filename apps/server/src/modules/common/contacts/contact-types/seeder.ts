import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { contactTypesCommonDefinition } from './definition.js'

const contactTypesSeedRows = [
  { name: '-' },
]

export function seedContactTypesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, contactTypesCommonDefinition, contactTypesSeedRows)
}
