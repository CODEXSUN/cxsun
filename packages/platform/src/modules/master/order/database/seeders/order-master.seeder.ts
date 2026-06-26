import type { Kysely } from 'kysely'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export function seedOrderMasterTable(_database: TenantDatabase) {
  // Order master records are tenant business data and must be created by users or imports.
}
