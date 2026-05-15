import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterDataDefinition } from '../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { contactMasterDefinition } from '../../domain/value-objects/contact-master.definition.js'

export function migrateContactMasterTable(database: Kysely<TenantDatabaseSchema>) {
  return migrateMasterDataDefinition(database, contactMasterDefinition)
}
