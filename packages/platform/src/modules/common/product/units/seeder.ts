import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { seedMasterRecordDefinition } from '../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { unitsCommonDefinition } from './definition.js'

const unitsSeedRows = [
  { name: '-' },
  { name: 'Bags' },
  { name: 'Bale' },
  { name: 'Bundles' },
  { name: 'Buckles' },
  { name: 'Billion Units' },
  { name: 'Box' },
  { name: 'Bottles' },
  { name: 'Bunches' },
  { name: 'Cans' },
  { name: 'Cubic Meters' },
  { name: 'Cubic Centimeters' },
  { name: 'Centimeters' },
  { name: 'Cartons' },
  { name: 'Dozen' },
  { name: 'Drums' },
  { name: 'Great Gross' },
  { name: 'Gram' },
  { name: 'Gross' },
  { name: 'Gross Yards' },
  { name: 'Kg' },
  { name: 'Kilolitre' },
  { name: 'Kilometre' },
  { name: 'Litre' },
  { name: 'Millilitre' },
  { name: 'Meter' },
  { name: 'Metric Ton' },
  { name: 'Nos' },
  { name: 'Others' },
  { name: 'Packs' },
  { name: 'Pcs' },
  { name: 'Pair' },
  { name: 'Packet' },
  { name: 'Quintal' },
  { name: 'Rolls' },
  { name: 'Sets' },
  { name: 'Square Feet' },
  { name: 'Square Meters' },
  { name: 'Square Yards' },
  { name: 'Tablets' },
  { name: 'Ten Gross' },
  { name: 'Thousands' },
  { name: 'Tonnes' },
  { name: 'Tubes' },
  { name: 'US Gallons' },
  { name: 'Units' },
  { name: 'Yards' },
]

export function seedUnitsCommonTable(database: Kysely<TenantDatabaseSchema>) {
  return seedMasterRecordDefinition(database, unitsCommonDefinition, unitsSeedRows)
}
