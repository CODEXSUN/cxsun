import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { ZetroProviderDatabase } from "./provider.types.js";

export async function seedZetroProviderPermission(database: Kysely<ZetroProviderDatabase>) {
  const key = "zetro.provider.manage";
  const permissionUuid = createHash("sha256").update(key).digest("hex").slice(0, 8);
  await sql`INSERT INTO app_permissions (uuid, \`key\`, label, description, status, is_protected)
    VALUES (${permissionUuid}, ${key}, 'Manage Zetro provider', 'Save tenant Zetro credentials and model.', 'active', TRUE)
    ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), status='active'`.execute(
    database
  );
  for (const roleKey of ["admin", "super-admin"]) {
    const roleUuid = createHash("sha256")
      .update(`role-permission:${roleKey}:${key}`)
      .digest("hex")
      .slice(0, 8);
    await sql`INSERT INTO app_role_permissions (uuid, role_id, permission_id, status, is_protected)
      SELECT ${roleUuid}, role.id, permission.id, 'active', TRUE
      FROM app_roles role INNER JOIN app_permissions permission ON permission.\`key\`=${key}
      WHERE role.\`key\`=${roleKey}
      ON DUPLICATE KEY UPDATE status='active'`.execute(database);
  }
}
