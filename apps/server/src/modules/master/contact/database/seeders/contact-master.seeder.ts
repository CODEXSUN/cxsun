import { sql, type Kysely } from 'kysely'
import type { Tenant } from '../../../../../core/tenant/domain/tenant.types.js'
import type { TenantDatabaseSchema } from '../../../../../infrastructure/tenant-database/tenant-database.schema.js'
import { dispatchPublicUuid } from '../../../../../shared/helpers/public-uuid.js'
import { seedMasterRecordDefinition } from '../../../../foundation/master-record/database/seeders/master-record.seeder.js'
import { contactMasterDefinition } from '../../domain/value-objects/contact-master.definition.js'

type TenantDatabase = Kysely<TenantDatabaseSchema>

export async function seedContactMasterTable(database: TenantDatabase, tenant: Tenant) {
  await seedMasterRecordDefinition(database, contactMasterDefinition, [
    { code: '-', name: '-', description: '-' },
  ])

  const code = `${tenant.slug.toUpperCase()}-CONTACT`
  const existing = await database
    .selectFrom('masters_contacts')
    .select('id')
    .where('code', '=', code)
    .executeTakeFirst()

  if (existing) {
    return
  }

  await sql`
    INSERT INTO masters_contacts (
      uuid,
      code,
      name,
      description,
      is_active,
      deleted_at
    ) VALUES (
      ${dispatchPublicUuid()},
      ${code},
      ${`${tenant.name} Default Contact`},
      ${`Default contact seed for ${tenant.name}.`},
      1,
      NULL
    )
  `.execute(database)
}
