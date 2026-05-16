import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../foundation/master-record/database/migrations/master-record.migration.js'
import { stylesCommonDefinition } from './definition.js'

export function migrateStylesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, stylesCommonDefinition)
}
