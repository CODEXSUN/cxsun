import { AsyncLocalStorage } from "node:async_hooks";
import type { Kysely } from "kysely";
import {
  rollbackMigrationBatch,
  runMigrationBatch,
  type MigrationBatch
} from "@cxsun/framework/db";
import {
  migratePlatformRegistryModule,
  platformRegistryMigration
} from "../modules/platform-registry/platform-registry.migration.js";
import { seedPlatformRegistryModule } from "../modules/platform-registry/platform-registry.seed.js";
import type { ProjectManagerDatabase } from "./schema.js";
import {
  projectManagerSchemaStandardizationMigration,
  standardizeProjectManagerSchema
} from "./devkit-schema-standardization.migration.js";
import {
  platformRegistryTableRenameMigration,
  renamePlatformRegistryTables
} from "./platform-registry-table-rename.js";
import {
  removeRetiredProjectManagerTables,
  retiredProjectManagerCleanupMigration
} from "./retired-devkit-cleanup.js";
import {
  projectManagerTableRenameMigration,
  renameProjectManagerTables
} from "./project-manager-table-rename.js";
import {
  ideasActivityAuditMigration,
  ideasMigration,
  migrateIdeasModule,
  standardizeIdeasActivity
} from "../modules/ideas/ideas.migration.js";

const databaseContext = new AsyncLocalStorage<Kysely<ProjectManagerDatabase>>();
const bootstraps = new WeakMap<Kysely<ProjectManagerDatabase>, Promise<void>>();
const requestDatabase = new Proxy({} as Kysely<ProjectManagerDatabase>, {
  get(_target, property) {
    const database = databaseContext.getStore();
    if (!database) throw new Error("Project Manager requires a CXSUN-provided request database.");
    const value = Reflect.get(database, property, database) as unknown;
    return typeof value === "function" ? value.bind(database) : value;
  }
});

const migrationSteps = [
  {
    description: platformRegistryTableRenameMigration.description,
    migrate: renamePlatformRegistryTables,
    name: platformRegistryTableRenameMigration.key
  },
  {
    description: platformRegistryMigration.description,
    migrate: migratePlatformRegistryModule,
    name: platformRegistryMigration.key
  },
  {
    description: projectManagerSchemaStandardizationMigration.description,
    migrate: standardizeProjectManagerSchema,
    name: projectManagerSchemaStandardizationMigration.key
  },
  {
    description: retiredProjectManagerCleanupMigration.description,
    migrate: removeRetiredProjectManagerTables,
    name: retiredProjectManagerCleanupMigration.key
  }
] as const;

const seedSteps = [
  { name: "project-manager.platform-registry", seed: seedPlatformRegistryModule }
] as const;

const legacyDevkitMigrationBatch: MigrationBatch<ProjectManagerDatabase> = {
  batch: 1,
  description: "DevKit module-owned schema baseline for CXSUN master and tenant databases.",
  scope: "devkit",
  version: "1.0.43",
  steps: migrationSteps.map(({ description, migrate, name }) => ({
    // Existing databases store this checksum; preserve it during the ownership transfer.
    checksum: `${name}:cxapp-v1`,
    description,
    name,
    up: migrate,
    version: 1
  }))
};

export const projectManagerMigrationBatch: MigrationBatch<ProjectManagerDatabase> = {
  batch: 1,
  description: projectManagerTableRenameMigration.description,
  scope: "project-manager",
  version: "1.0.80",
  steps: [
    {
      checksum: `${projectManagerTableRenameMigration.key}:v1`,
      description: projectManagerTableRenameMigration.description,
      name: projectManagerTableRenameMigration.key,
      up: renameProjectManagerTables,
      version: 1
    }
  ]
};

export const projectManagerIdeasMigrationBatch: MigrationBatch<ProjectManagerDatabase> = {
  batch: 2,
  description: ideasMigration.description,
  scope: "project-manager",
  version: "1.0.80",
  steps: [
    {
      checksum: `${ideasMigration.key}:v1`,
      description: ideasMigration.description,
      name: ideasMigration.key,
      up: migrateIdeasModule,
      version: 1
    }
  ]
};

const projectManagerIdeasAuditBatch: MigrationBatch<ProjectManagerDatabase> = {
  batch: 3,
  description: ideasActivityAuditMigration.description,
  scope: "project-manager",
  version: "1.0.80",
  steps: [
    {
      checksum: `${ideasActivityAuditMigration.key}:v1`,
      description: ideasActivityAuditMigration.description,
      name: ideasActivityAuditMigration.key,
      up: standardizeIdeasActivity,
      version: 1
    }
  ]
};

export function getProjectManagerDatabase() {
  return requestDatabase;
}

export function runWithProjectManagerDatabase<T>(
  database: Kysely<ProjectManagerDatabase>,
  callback: () => T
) {
  return databaseContext.run(database, callback);
}

export async function bootstrapProjectManagerDatabase(database: Kysely<ProjectManagerDatabase>) {
  const existing = bootstraps.get(database);
  if (existing) return existing;
  const bootstrap = (async () => {
    await migrateProjectManagerDatabase(database);
    await seedProjectManagerDatabase(database);
  })().catch((error) => {
    bootstraps.delete(database);
    throw error;
  });
  bootstraps.set(database, bootstrap);
  return bootstrap;
}

export async function migrateProjectManagerDatabase(database: Kysely<ProjectManagerDatabase>) {
  await runMigrationBatch(database, legacyDevkitMigrationBatch, { batchSize: 5 });
  const result = await runMigrationBatch(database, projectManagerMigrationBatch);
  const ideasResult = await runMigrationBatch(database, projectManagerIdeasMigrationBatch);
  const auditResult = await runMigrationBatch(database, projectManagerIdeasAuditBatch);
  console.info(
    `[database] Project Manager migrations: ${result.applied.length + ideasResult.applied.length + auditResult.applied.length} applied, ${result.skipped.length + ideasResult.skipped.length + auditResult.skipped.length} checksum-validated`
  );
}

export async function rollbackProjectManagerDatabase(database: Kysely<ProjectManagerDatabase>) {
  await rollbackMigrationBatch(database, projectManagerIdeasAuditBatch);
  await rollbackMigrationBatch(database, projectManagerIdeasMigrationBatch);
  await rollbackMigrationBatch(database, projectManagerMigrationBatch);
  return rollbackMigrationBatch(database, legacyDevkitMigrationBatch);
}

export async function seedProjectManagerDatabase(database: Kysely<ProjectManagerDatabase>) {
  for (const step of seedSteps) {
    const result = await step.seed(database);
    console.info(`[seeder] ${step.name}: ${result.records} records imported`);
  }
}

export const projectManagerTenantMigrations = [
  ...migrationSteps,
  {
    description: projectManagerTableRenameMigration.description,
    migrate: renameProjectManagerTables,
    name: projectManagerTableRenameMigration.key
  },
  {
    description: ideasMigration.description,
    migrate: migrateIdeasModule,
    name: ideasMigration.key
  },
  {
    description: ideasActivityAuditMigration.description,
    migrate: standardizeIdeasActivity,
    name: ideasActivityAuditMigration.key
  }
] as const;

export const projectManagerDatabaseLifecycle = Object.freeze({
  migrations: Object.freeze(projectManagerTenantMigrations.map(({ name }) => name)),
  packageId: "@cxsun/project-manager-api",
  seeders: Object.freeze(seedSteps.map(({ name }) => name)),
  async runSql({ database }: { database: unknown }) {
    await bootstrapProjectManagerDatabase(database as Kysely<ProjectManagerDatabase>);
  }
});
