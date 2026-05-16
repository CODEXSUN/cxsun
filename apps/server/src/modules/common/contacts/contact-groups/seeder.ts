import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { contactGroupsCommonDefinition } from './definition.js'

const contactGroupsSeedRows = [
  { name: '-' },
]

export function seedContactGroupsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, contactGroupsCommonDefinition, contactGroupsSeedRows)
}
