import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { hsnCodesCommonDefinition } from './definition.js'

const hsnCodesSeedRows = [
  { name: '-' },
]

export function seedHsnCodesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, hsnCodesCommonDefinition, hsnCodesSeedRows)
}
