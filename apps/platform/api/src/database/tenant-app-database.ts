import {
  billingTenantMigrations,
  migrateBillingTenantDatabase,
  rollbackBillingTenantDatabase,
  seedBillingTenantDatabase
} from "@cxsun/billing-api";
import {
  accountsTenantMigrations,
  migrateAccountsTenantDatabase,
  rollbackAccountsTenantDatabase,
  seedAccountsTenantDatabase
} from "@cxsun/accounts-api";
import {
  coreTenantMigrations,
  migrateCoreTenantDatabase,
  rollbackCoreTenantDatabase,
  seedCoreTenantDatabase,
  setDefaultCompanyLandingAppForDatabase
} from "@cxsun/core-api";
import {
  crmTenantMigrations,
  migrateCrmTenantDatabase,
  rollbackCrmTenantDatabase,
  seedCrmTenantDatabase,
  type EnquiryDatabase
} from "@cxsun/crm-api";
import {
  auditorMigrations,
  migrateAuditorDatabase,
  rollbackAuditorDatabase,
  seedAuditorClientPermissions,
  type AuditorClientDatabase
} from "@cxsun/auditor-api";
import {
  mailMigrationBatch,
  migrateMailModule,
  rollbackMailModule,
  seedMailModule
} from "@cxsun/mail-api";
import type { Kysely } from "kysely";
import {
  frappeTenantMigrations,
  frappeUserMappingMigrations,
  seedFrappeConnectionPermissions,
  migrateFrappeTenantDatabase,
  migrateFrappeUserMappingDatabase,
  rollbackFrappeTenantDatabase,
  rollbackFrappeUserMappingDatabase,
  type FrappeDatabase,
  type FrappeUserMappingDatabase
} from "@cxsun/frappe-api";
import {
  zetroChatMigrations,
  zetroProviderMigrations,
  migrateZetroChatDatabase,
  migrateZetroProviderDatabase,
  rollbackZetroChatDatabase,
  rollbackZetroProviderDatabase,
  seedZetroChatPermissions,
  seedZetroProviderPermission,
  type ZetroDatabase,
  type ZetroProviderDatabase
} from "@cxsun/zetro-api";
import {
  migrateProjectManagerDatabase,
  projectManagerTenantMigrations
} from "@cxsun/project-manager-api";
import type { TenantDatabase } from "./schema.js";
import type { Tenant } from "../modules/tenant/tenant.types.js";
import { tenantRuntimeMigrations } from "../modules/tenant/tenant.migration.js";
import {
  migrateTaskManagerTenantModule,
  rollbackTaskManagerTenantModule,
  taskManagerTenantMigrationBatch
} from "../modules/task-manager/task-manager.migration.js";
import { seedTaskManagerModule } from "../modules/task-manager/task-manager.seed.js";

const mailTenantMigrations = mailMigrationBatch.steps.map(({ description, name }) => ({
  description,
  name
}));

export function tenantDatabaseMigrationsFor(tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  return [
    ...tenantRuntimeMigrations.map(({ description, name, statements }) => ({
      description,
      name,
      statements
    })),
    ...coreTenantMigrations.map((migration) => ({
      ...migration,
      statements: [`RUN ${migration.name}`]
    })),
    ...projectManagerTenantMigrations.map(({ description, name }) => ({
      description,
      name,
      statements: [`RUN ${name}`]
    })),
    ...(enabled.has("crm")
      ? crmTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("crm") && enabled.has("frappe")
      ? frappeTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("crm") && enabled.has("frappe")
      ? frappeUserMappingMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("auditor")
      ? auditorMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("zetro")
      ? zetroChatMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("zetro")
      ? zetroProviderMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("billing.sales")
      ? billingTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("accounts.accounting")
      ? accountsTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("mail")
      ? mailTenantMigrations.map((migration) => ({
          ...migration,
          statements: [`RUN ${migration.name}`]
        }))
      : []),
    ...(enabled.has("platform.task-manager")
      ? taskManagerTenantMigrationBatch.steps.map(({ description, name }) => ({
          description,
          name,
          statements: [`RUN ${name}`]
        }))
      : [])
  ];
}

export async function migrateSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  const provisionedApps = ["application"];

  await migrateCoreTenantDatabase(tenant.dbName);
  await migrateProjectManagerDatabase(database as never);
  if (enabled.has("crm")) {
    await migrateCrmTenantDatabase(database as unknown as Kysely<EnquiryDatabase>);
    provisionedApps.push("crm");
  }
  if (enabled.has("crm") && enabled.has("frappe")) {
    await migrateFrappeTenantDatabase(database as unknown as Kysely<FrappeDatabase>);
    await migrateFrappeUserMappingDatabase(
      database as unknown as Kysely<FrappeUserMappingDatabase>
    );
    provisionedApps.push("frappe");
  }
  if (enabled.has("auditor")) {
    await migrateAuditorDatabase(database as unknown as Kysely<AuditorClientDatabase>);
    provisionedApps.push("auditor");
  }
  if (enabled.has("zetro")) {
    await migrateZetroChatDatabase(database as unknown as Kysely<ZetroDatabase>);
    await migrateZetroProviderDatabase(database as unknown as Kysely<ZetroProviderDatabase>);
    provisionedApps.push("zetro");
  }

  if (enabled.has("billing.sales")) {
    await migrateBillingTenantDatabase(tenant.dbName);
    provisionedApps.push("billing");
  }

  if (enabled.has("accounts.accounting")) {
    await migrateAccountsTenantDatabase(tenant.dbName);
    provisionedApps.push("accounts");
  }

  if (enabled.has("mail")) {
    await migrateMailModule(database as never);
    provisionedApps.push("mail");
  }

  if (enabled.has("platform.task-manager")) {
    await migrateTaskManagerTenantModule(database as never);
    provisionedApps.push("task-manager");
  }

  return {
    migrationOrder: tenantDatabaseMigrationsFor(tenant).map((migration) => migration.name),
    provisionedApps
  };
}

export async function seedSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  const seededApps = ["application"];

  await seedCoreTenantDatabase(tenant.dbName);
  if (enabled.has("crm")) {
    await seedCrmTenantDatabase(database as unknown as Kysely<EnquiryDatabase>);
    seededApps.push("crm");
  }
  if (enabled.has("crm") && enabled.has("frappe")) {
    await seedFrappeConnectionPermissions(database as unknown as Kysely<FrappeDatabase>);
    seededApps.push("frappe");
  }
  if (enabled.has("auditor")) {
    await seedAuditorClientPermissions(database as unknown as Kysely<AuditorClientDatabase>);
    seededApps.push("auditor");
  }
  if (enabled.has("zetro")) {
    await seedZetroChatPermissions(database as unknown as Kysely<ZetroDatabase>);
    await seedZetroProviderPermission(database as unknown as Kysely<ZetroProviderDatabase>);
    seededApps.push("zetro");
  }
  await setDefaultCompanyLandingAppForDatabase(tenant.dbName, tenant.defaultLandingApp);

  if (enabled.has("billing.sales")) {
    await seedBillingTenantDatabase(tenant.dbName);
    seededApps.push("billing");
  }

  if (enabled.has("accounts.accounting")) {
    await seedAccountsTenantDatabase(tenant.dbName);
    seededApps.push("accounts");
  }

  if (enabled.has("mail")) {
    await seedMailModule(database as never);
    seededApps.push("mail");
  }

  if (enabled.has("platform.task-manager")) {
    await seedTaskManagerModule(database, {
      importLegacyJson: false,
      scopeKey: taskManagerTenantScope(tenant)
    });
    seededApps.push("task-manager");
  }
  return { seededApps };
}

export async function rollbackSelectedTenantApps(database: Kysely<TenantDatabase>, tenant: Tenant) {
  const enabled = new Set(tenant.enabledModuleKeys);
  if (enabled.has("platform.task-manager"))
    await rollbackTaskManagerTenantModule(database as never);
  if (enabled.has("mail")) await rollbackMailModule(database as never);
  if (enabled.has("crm") && enabled.has("frappe")) {
    await rollbackFrappeUserMappingDatabase(
      database as unknown as Kysely<FrappeUserMappingDatabase>
    );
    await rollbackFrappeTenantDatabase(database as unknown as Kysely<FrappeDatabase>);
  }
  if (enabled.has("crm")) {
    await rollbackCrmTenantDatabase(database as unknown as Kysely<EnquiryDatabase>);
  }
  if (enabled.has("auditor"))
    await rollbackAuditorDatabase(database as unknown as Kysely<AuditorClientDatabase>);
  if (enabled.has("zetro")) {
    await rollbackZetroProviderDatabase(database as unknown as Kysely<ZetroProviderDatabase>);
    await rollbackZetroChatDatabase(database as unknown as Kysely<ZetroDatabase>);
  }
  if (enabled.has("billing.sales")) await rollbackBillingTenantDatabase(tenant.dbName);
  if (enabled.has("accounts.accounting")) await rollbackAccountsTenantDatabase(tenant.dbName);
  await rollbackCoreTenantDatabase(tenant.dbName);
}

export async function provisionSelectedTenantApps(
  database: Kysely<TenantDatabase>,
  tenant: Tenant
) {
  const migrated = await migrateSelectedTenantApps(database, tenant);
  const seeded = await seedSelectedTenantApps(database, tenant);
  return { ...migrated, ...seeded };
}

export function taskManagerTenantScope(tenant: Pick<Tenant, "uuid">) {
  return `tenant:${tenant.uuid}`;
}
