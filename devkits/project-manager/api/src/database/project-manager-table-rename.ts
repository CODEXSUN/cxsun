import type { Kysely } from "kysely";
import { renameLegacyTable } from "./database-utils.js";
import type { ProjectManagerDatabase } from "./schema.js";

const registryTables = ["platforms", "groups", "modules", "activity"] as const;

export const projectManagerTableRenameMigration = {
  description:
    "Transfer Platform Registry tables from DevKit to Project Manager without copying records.",
  key: "project-manager.platform-registry-ownership.v1"
} as const;

export async function renameProjectManagerTables(database: Kysely<ProjectManagerDatabase>) {
  for (const suffix of registryTables) {
    await renameLegacyTable(
      database,
      `devkit_platform_registry_${suffix}`,
      `project_manager_platform_registry_${suffix}`
    );
  }
}
