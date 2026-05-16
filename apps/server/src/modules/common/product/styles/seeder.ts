import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { stylesCommonDefinition } from './definition.js'

const stylesSeedRows = [
  { name: '-' },
]

export function seedStylesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, stylesCommonDefinition, stylesSeedRows)
}
