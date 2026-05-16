import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { paymentTermsCommonDefinition } from './definition.js'

const paymentTermsSeedRows = [
  { name: '-' },
]

export function seedPaymentTermsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, paymentTermsCommonDefinition, paymentTermsSeedRows)
}
