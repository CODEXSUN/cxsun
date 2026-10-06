import {
  rollbackMigrationBatch,
  runMigrationBatch,
  type MigrationBatch
} from "@cxsun/framework/db";
import { sql, type Kysely } from "kysely";
import type { TaskManagerLookupsTable, TaskManagerTodosTable } from "../../database/schema.js";

export type TaskManagerDatabase = {
  task_manager_lookups: TaskManagerLookupsTable;
  task_manager_todos: TaskManagerTodosTable;
};

export const taskManagerMigration = {
  key: "platform.task-manager.database-v1",
  description: "Database-backed tenant and Super Admin tasks and lookup values."
};

export const taskManagerVisibilityMigration = {
  key: "platform.task-manager.visibility-v2",
  description: "Private and public visibility for Task Manager todos."
};

export const taskManagerTitleOnlyMigration = {
  key: "platform.task-manager.title-only-v3",
  description: "Remove the description column from Task Manager todos."
};

export const taskManagerTenantMigrationBatch: MigrationBatch<TaskManagerDatabase> = {
  batch: 1,
  description: taskManagerMigration.description,
  scope: "platform.task-manager",
  version: "1.0.45",
  steps: [
    {
      checksum: `${taskManagerMigration.key}:v1`,
      description: taskManagerMigration.description,
      down: rollbackTaskManagerModule,
      name: taskManagerMigration.key,
      up: migrateTaskManagerModule,
      version: 1
    },
    {
      checksum: `${taskManagerVisibilityMigration.key}:v1`,
      description: taskManagerVisibilityMigration.description,
      down: rollbackTaskManagerVisibility,
      name: taskManagerVisibilityMigration.key,
      up: migrateTaskManagerVisibility,
      version: 2
    },
    {
      checksum: `${taskManagerTitleOnlyMigration.key}:v1`,
      description: taskManagerTitleOnlyMigration.description,
      down: rollbackTaskManagerTitleOnly,
      name: taskManagerTitleOnlyMigration.key,
      up: migrateTaskManagerTitleOnly,
      version: 3
    }
  ]
};

export function migrateTaskManagerTenantModule(database: Kysely<TaskManagerDatabase>) {
  return runMigrationBatch(database, taskManagerTenantMigrationBatch);
}

export function rollbackTaskManagerTenantModule(database: Kysely<TaskManagerDatabase>) {
  return rollbackMigrationBatch(database, taskManagerTenantMigrationBatch);
}

export async function migrateTaskManagerModule<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await db.schema
    .createTable("task_manager_todos")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("scope_key", "varchar(80)", (column) => column.notNull().defaultTo("super-admin"))
    .addColumn("title", "varchar(255)", (column) => column.notNull())
    .addColumn("description", "text", (column) => column.notNull())
    .addColumn("category", "varchar(80)", (column) => column.notNull().defaultTo("work"))
    .addColumn("group_name", "varchar(120)", (column) => column.notNull().defaultTo(""))
    .addColumn("status", "varchar(40)", (column) => column.notNull().defaultTo("open"))
    .addColumn("priority", "varchar(40)", (column) => column.notNull().defaultTo("medium"))
    .addColumn("visibility", "varchar(16)", (column) => column.notNull().defaultTo("private"))
    .addColumn("due_date", "varchar(32)", (column) => column.notNull().defaultTo(""))
    .addColumn("position", "integer", (column) => column.notNull().defaultTo(0))
    .addColumn("created_by", "varchar(191)", (column) =>
      column.notNull().defaultTo("system:migration")
    )
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .modifyEnd(sql` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    .execute();

  await db.schema
    .createIndex("task_manager_todos_scope_position_idx")
    .ifNotExists()
    .on("task_manager_todos")
    .columns(["scope_key", "position"])
    .execute();
  await db.schema
    .createIndex("task_manager_todos_scope_status_idx")
    .ifNotExists()
    .on("task_manager_todos")
    .columns(["scope_key", "status"])
    .execute();

  await db.schema
    .createTable("task_manager_lookups")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("uuid", "varchar(8)", (column) =>
      column
        .notNull()
        .unique()
        .defaultTo(sql`LOWER(SUBSTRING(MD5(UUID()),1,8))`)
    )
    .addColumn("scope_key", "varchar(80)", (column) => column.notNull().defaultTo("super-admin"))
    .addColumn("kind", "varchar(24)", (column) => column.notNull())
    .addColumn("name", "varchar(120)", (column) => column.notNull())
    .addColumn("value", "varchar(120)", (column) => column.notNull())
    .addColumn("status", "varchar(24)", (column) => column.notNull().defaultTo("active"))
    .addColumn("created_by", "varchar(191)", (column) =>
      column.notNull().defaultTo("system:migration")
    )
    .addColumn("created_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addColumn("updated_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .addUniqueConstraint("task_manager_lookups_scope_kind_name_uq", ["scope_key", "kind", "name"])
    .addUniqueConstraint("task_manager_lookups_scope_kind_value_uq", ["scope_key", "kind", "value"])
    .modifyEnd(sql` ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`)
    .execute();
}

export async function rollbackTaskManagerModule<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await db.schema.dropTable("task_manager_lookups").ifExists().execute();
  await db.schema.dropTable("task_manager_todos").ifExists().execute();
}

export async function migrateTaskManagerVisibility<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await sql`ALTER TABLE task_manager_todos ADD COLUMN IF NOT EXISTS visibility VARCHAR(16) NOT NULL DEFAULT 'private'`.execute(
    db
  );
}

export async function rollbackTaskManagerVisibility<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await sql`ALTER TABLE task_manager_todos DROP COLUMN IF EXISTS visibility`.execute(db);
}

export async function migrateTaskManagerTitleOnly<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await sql`ALTER TABLE task_manager_todos DROP COLUMN IF EXISTS description`.execute(db);
}

export async function rollbackTaskManagerTitleOnly<Database extends TaskManagerDatabase>(
  db: Kysely<Database>
) {
  await sql`ALTER TABLE task_manager_todos ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT ''`.execute(
    db
  );
}
