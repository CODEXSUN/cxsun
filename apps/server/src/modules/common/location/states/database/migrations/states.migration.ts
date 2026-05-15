import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { statesCommonDefinition } from '../../domain/value-objects/states.definition.js'

export function migrateStatesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterRecordDefinition(database, statesCommonDefinition)
}
