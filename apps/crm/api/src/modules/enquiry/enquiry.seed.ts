import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { EnquiryDatabase } from "./enquiry.types.js";

export async function seedEnquiryModule(database: Kysely<EnquiryDatabase>) {
  for (const action of ["view", "view-all", "create", "update"] as const) {
    const key = `crm.enquiry.${action}`;
    const label = `CRM enquiry ${action}`;
    await sql`
      INSERT INTO app_permissions (uuid, \`key\`, label, description, status, is_protected)
      VALUES (${stable(key)}, ${key}, ${label}, ${`Allows ${label}.`}, 'active', TRUE)
      ON DUPLICATE KEY UPDATE label=VALUES(label), description=VALUES(description), status='active'
    `.execute(database);
    await sql`
      INSERT INTO app_role_permissions (uuid, role_id, permission_id, status, is_protected)
      SELECT ${stable(`role-permission:admin:${key}`)}, role.id, permission.id, 'active', TRUE
      FROM app_roles role INNER JOIN app_permissions permission ON permission.\`key\`=${key}
      WHERE role.\`key\`='admin'
      ON DUPLICATE KEY UPDATE status='active'
    `.execute(database);
  }
}

function stable(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
