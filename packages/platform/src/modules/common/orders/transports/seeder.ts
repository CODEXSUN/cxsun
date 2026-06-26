import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { transportsCommonDefinition } from './definition.js'

const transportsSeedRows = [
  { name: '-', gst: '', vehicle_no: '', address: '', contact_no: '', contact_person: '' },
  { name: 'Own Vehicle', gst: '', vehicle_no: '', address: '', contact_no: '', contact_person: '' },
  { name: 'Customer Pickup', gst: '', vehicle_no: '', address: '', contact_no: '', contact_person: '' },
]

export function seedTransportsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, transportsCommonDefinition, transportsSeedRows)
}
