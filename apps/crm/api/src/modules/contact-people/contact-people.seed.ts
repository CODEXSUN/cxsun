import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { ContactPeopleDatabase } from "./contact-people.types.js";

export async function seedContactPeople(database: Kysely<ContactPeopleDatabase>) {
  for (const action of ["view", "create", "update"] as const) {
    const key = `crm.contact-people.${action}`;
    const label = `CRM contact-people ${action}`;
    const stable = (value: string) => createHash("sha256").update(value).digest("hex").slice(0, 8);
    await sql`INSERT INTO app_permissions (uuid, \`key\`, label, description, status, is_protected)
      VALUES (${stable(key)}, ${key}, ${label}, ${label}, 'active', TRUE)
      ON DUPLICATE KEY UPDATE label=VALUES(label), status='active'`.execute(database);
    await sql`INSERT INTO app_role_permissions (uuid, role_id, permission_id, status, is_protected)
      SELECT ${stable(`role-permission:admin:${key}`)}, role.id, permission.id, 'active', TRUE
      FROM app_roles role INNER JOIN app_permissions permission ON permission.\`key\`=${key}
      WHERE role.\`key\`='admin'
      ON DUPLICATE KEY UPDATE status='active'`.execute(database);
  }
}
