import type { ColumnType, Generated } from "kysely";

export type TimestampColumn = ColumnType<
  Date,
  Date | string | undefined,
  Date | string | undefined
>;

export type ProjectManagerDatabase = {
  project_manager_ideas: ProjectManagerIdeasTable;
  project_manager_ideas_activity: ProjectManagerIdeasActivityTable;
  project_manager_platform_registry_activity: PlatformRegistryActivityTable;
  project_manager_platform_registry_groups: PlatformRegistryGroupsTable;
  project_manager_platform_registry_modules: PlatformRegistryModulesTable;
  project_manager_platform_registry_platforms: PlatformRegistryPlatformsTable;
};

export type ProjectManagerIdeasTable = {
  assignee: string;
  category: string;
  content_html: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  status: string;
  title: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type ProjectManagerIdeasActivityTable = {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  created_by: string;
  id: Generated<number>;
  idea_uuid: string;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

type RegistryColumns = {
  active: number;
  created_at: TimestampColumn;
  description: string;
  id: Generated<number>;
  name: string;
  sort_order: number;
  status: string;
  updated_at: TimestampColumn;
  uuid: string;
};

export type PlatformRegistryPlatformsTable = RegistryColumns & {
  platform_key: string;
};

export type PlatformRegistryGroupsTable = RegistryColumns & {
  group_key: string;
  parent_group_uuid: string | null;
  platform_uuid: string;
};

export type PlatformRegistryModulesTable = RegistryColumns & {
  documentation_json: string;
  group_uuid: string;
  module_key: string;
  module_type: string;
  parent_module_uuid: string | null;
  planning_notes_json: string;
  route_path: string;
};

export type PlatformRegistryActivityTable = {
  action: string;
  actor_email: string;
  created_at: TimestampColumn;
  details_json: string;
  id: Generated<number>;
  record_kind: string;
  record_uuid: string;
  uuid: string;
};
