import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterRecordDefinition } from '../../../foundation/master-record/database/migrations/master-record.migration.js'
import { pincodesCommonDefinition } from './definition.js'

export async function migratePincodesCommonTable(database: Kysely<TenantDatabaseSchema>) {
  await migrateMasterRecordDefinition(database, pincodesCommonDefinition)
  await sql.raw('ALTER TABLE common_pincodes ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL').execute(database)
  await sql.raw('ALTER TABLE common_pincodes ADD COLUMN IF NOT EXISTS code VARCHAR(255) NULL').execute(database)
  await sql.raw("UPDATE common_pincodes SET name = COALESCE(NULLIF(TRIM(name), ''), NULLIF(TRIM(code), ''), '-')").execute(database)
  await sql.raw(`
    ALTER TABLE common_pincodes
      MODIFY COLUMN name VARCHAR(255) NOT NULL,
      DROP COLUMN IF EXISTS country_id,
      DROP COLUMN IF EXISTS state_id,
      DROP COLUMN IF EXISTS district_id,
      DROP COLUMN IF EXISTS city_id,
      DROP COLUMN IF EXISTS code,
      DROP COLUMN IF EXISTS area_name
  `).execute(database)
  await sql.raw('CREATE INDEX IF NOT EXISTS idx_common_pincodes_name ON common_pincodes (name)').execute(database)
}
