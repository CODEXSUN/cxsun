import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { PriorityDatabase } from "./priority.types.js";

export async function seedPriorityMaster(database: Kysely<PriorityDatabase>) {
  for (const [code, name, order] of [
    ["low", "Low", 1],
    ["normal", "Normal", 2],
    ["high", "High", 3],
    ["urgent", "Urgent", 4]
  ] as const) {
    await database
      .insertInto("crm_enquiry_priorities")
      .values({
        code,
        name,
        sort_order: order,
        status: "active",
        created_by: "system:seed",
        updated_by: "system:seed"
      })
      .onDuplicateKeyUpdate({ id: sql`id` })
      .execute();
  }
  for (const action of ["view", "create", "update", "delete"] as const) {
    const key = `crm.priority.${action}`;
    const label = `CRM Priority ${action}`;
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
