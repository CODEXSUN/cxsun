import { sql, type Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { migrateMasterDataDefinition } from '../../../../foundation/master-record/database/migrations/master-record.migration.js'
import { contactMasterDefinition } from '../../domain/value-objects/contact-master.definition.js'

export async function migrateContactMasterTable(database: Kysely<TenantDatabaseSchema>) {
  await migrateMasterDataDefinition(database, contactMasterDefinition)
  await sql`
    CREATE TABLE IF NOT EXISTS contact_code_sequences (
      sequence_key VARCHAR(80) NOT NULL PRIMARY KEY,
      next_number INT UNSIGNED NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `.execute(database)
  await sql`
    INSERT INTO contact_code_sequences (sequence_key, next_number)
    SELECT
      'contact',
      COALESCE(MAX(
        CASE
          WHEN code REGEXP '^C-[0-9]+$' THEN CAST(SUBSTRING(code, 3) AS UNSIGNED)
          ELSE 0
        END
      ), 0) + 1
    FROM masters_contacts
    ON DUPLICATE KEY UPDATE
      next_number = GREATEST(contact_code_sequences.next_number, VALUES(next_number))
  `.execute(database)
}
