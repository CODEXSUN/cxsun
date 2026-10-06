import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { Kysely } from "kysely";
import { resolveProjectManagerSeedDirectory } from "../../database/seed-source.js";
import type { ProjectManagerDatabase } from "../../database/schema.js";
import type {
  PlatformRegistryGroup,
  PlatformRegistryModule,
  PlatformRegistryPlatform
} from "./platform-registry.types.js";

const sourceDir = resolveProjectManagerSeedDirectory(import.meta.url, "platform-registry-json");

export async function seedPlatformRegistryModule(database: Kysely<ProjectManagerDatabase>) {
  let records = 0;
  records += await seedPlatforms(database);
  records += await seedGroups(database);
  records += await seedModules(database);
  return { module: "project-manager.platform-registry", records };
}

async function seedPlatforms(database: Kysely<ProjectManagerDatabase>) {
  if ((await count(database, "project_manager_platform_registry_platforms")) > 0) return 0;
  const rows = await readJson<PlatformRegistryPlatform[]>("platform-registry.json");
  if (rows.length) {
    await database
      .insertInto("project_manager_platform_registry_platforms")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          name: row.name,
          platform_key: row.key,
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();
  }
  return rows.length;
}

async function seedGroups(database: Kysely<ProjectManagerDatabase>) {
  if ((await count(database, "project_manager_platform_registry_groups")) > 0) return 0;
  const rows = await readJson<PlatformRegistryGroup[]>("module-groups.json");
  if (rows.length) {
    await database
      .insertInto("project_manager_platform_registry_groups")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          group_key: row.key,
          name: row.name,
          parent_group_uuid: null,
          platform_uuid: importedUuid(row.platformId),
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();

    for (const row of rows.filter((item) => item.parentGroupId)) {
      await database
        .updateTable("project_manager_platform_registry_groups")
        .set({ parent_group_uuid: importedUuid(row.parentGroupId) })
        .where("uuid", "=", importedUuid(row.id))
        .execute();
    }
  }
  return rows.length;
}

async function seedModules(database: Kysely<ProjectManagerDatabase>) {
  if ((await count(database, "project_manager_platform_registry_modules")) > 0) return 0;
  const rows = await readJson<PlatformRegistryModule[]>("module-registry.json");
  if (rows.length) {
    await database
      .insertInto("project_manager_platform_registry_modules")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          documentation_json: JSON.stringify(row.documentation ?? {}),
          group_uuid: importedUuid(row.groupId),
          module_key: row.key,
          module_type: row.moduleType ?? "module",
          name: row.name,
          parent_module_uuid: null,
          planning_notes_json: JSON.stringify(row.planningNotes ?? []),
          route_path: row.routePath ?? "",
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();

    for (const row of rows.filter((item) => item.parentModuleId)) {
      await database
        .updateTable("project_manager_platform_registry_modules")
        .set({ parent_module_uuid: importedUuid(row.parentModuleId) })
        .where("uuid", "=", importedUuid(row.id))
        .execute();
    }
  }
  return rows.length;
}

async function readJson<T>(file: string) {
  return JSON.parse(await readFile(join(sourceDir, file), "utf8")) as T;
}

async function count(
  database: Kysely<ProjectManagerDatabase>,
  table:
    | "project_manager_platform_registry_groups"
    | "project_manager_platform_registry_modules"
    | "project_manager_platform_registry_platforms"
) {
  const row = await database
    .selectFrom(table)
    .select(({ fn }) => fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return Number(row.count);
}

function importedUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function date(value: string) {
  return new Date(value);
}
