import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { ListInDatabase } from "./list-in.types.js";

export async function seedListInMaster(database: Kysely<ListInDatabase>) {
  for (const [name, sortOrder] of [
    ["Accounts", 1],
    ["office", 2],
    ["Stores", 3],
    ["Services", 4]
  ] as const) {
    await database
      .insertInto("crm_enquiry_lists")
      .values({
        name,
        sort_order: sortOrder,
        status: "active",
        created_by: "system:seed",
        updated_by: "system:seed"
      })
      .onDuplicateKeyUpdate({ id: sql`id` })
      .execute();
  }
  for (const action of ["view", "create", "update", "delete"] as const) {
    const key = `crm.list-in.${action}`;
    const label = `CRM List In ${action}`;
    await sql`INSERT INTO app_permissions (uuid, \`key\`, label, description, status, is_protected)
      VALUES (${stable(key)}, ${key}, ${label}, ${"Allows " + label + "."}, 'active', TRUE)
      ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), status='active'`.execute(
      database
    );
    await sql`INSERT INTO app_role_permissions (uuid, role_id, permission_id, status, is_protected)
      SELECT ${stable("role-permission:admin:" + key)}, role.id, permission.id, 'active', TRUE
      FROM app_roles role INNER JOIN app_permissions permission ON permission.\`key\`=${key}
      WHERE role.\`key\`='admin' ON DUPLICATE KEY UPDATE status='active'`.execute(database);
  }
}
function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
