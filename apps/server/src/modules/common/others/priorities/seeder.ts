import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { prioritiesCommonDefinition } from './definition.js'

const prioritiesSeedRows = [
  { name: 'Low', colour: '#64748b', tag: 'low' },
  { name: 'Normal', colour: '#0ea5e9', tag: 'normal' },
  { name: 'High', colour: '#f59e0b', tag: 'high' },
  { name: 'Urgent', colour: '#ef4444', tag: 'urgent' },
]

export function seedPrioritiesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, prioritiesCommonDefinition, prioritiesSeedRows)
}
