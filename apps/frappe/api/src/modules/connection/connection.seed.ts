import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { FrappeDatabase } from "./connection.types.js";

export async function seedFrappeConnectionPermissions(database: Kysely<FrappeDatabase>) {
  const key = "frappe.connection.manage";
  const uuid = createHash("sha256").update(key).digest("hex").slice(0, 8);
  const roleUuid = createHash("sha256")
    .update(`role-permission:admin:${key}`)
    .digest("hex")
    .slice(0, 8);
  await sql`INSERT INTO app_permissions (uuid, \`key\`, label, description, status, is_protected)
    VALUES (${uuid}, ${key}, 'Manage Frappe connection', 'Allows saving and verifying Frappe credentials.', 'active', TRUE)
    ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), status='active'`.execute(
    database
  );
  await sql`INSERT INTO app_role_permissions (uuid, role_id, permission_id, status, is_protected)
    SELECT ${roleUuid}, role.id, permission.id, 'active', TRUE
    FROM app_roles role INNER JOIN app_permissions permission ON permission.\`key\`=${key}
    WHERE role.\`key\`='admin'
    ON DUPLICATE KEY UPDATE status='active'`.execute(database);
}
