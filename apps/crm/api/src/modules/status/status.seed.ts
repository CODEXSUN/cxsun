import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { StatusDatabase } from "./status.types.js";

export async function seedStatusMaster(database: Kysely<StatusDatabase>) {
  for (const [code, name, order] of [
    ["new", "New", 1],
    ["open", "Open", 2],
    ["won", "Won", 3],
    ["lost", "Lost", 4],
    ["hold-for-approval", "Hold for Approval", 5],
    ["long-hold", "Long Hold", 6],
    ["hold-for-spares", "Hold for Spares", 7],
    ["closed", "Closed", 8],
    ["hold-for-job-out", "Hold for Job-Out", 9],
    ["escalation", "Escalation", 10],
    ["reopen", "Re-open", 11]
  ] as const) {
    await database
      .insertInto("crm_enquiry_statuses")
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
  await sql`UPDATE crm_enquiry_statuses AS status_master
    SET status_master.status='inactive', status_master.updated_by='system:seed'
    WHERE status_master.code IN ('contacted', 'qualified', 'unqualified')
      AND status_master.created_by='system:seed'
      AND status_master.updated_by='system:seed'
      AND NOT EXISTS (
        SELECT 1 FROM crm_enquiries AS enquiry WHERE enquiry.status_id=status_master.id
      )`.execute(database);
  for (const action of ["view", "create", "update", "delete"] as const) {
    const key = `crm.status.${action}`;
    const label = `CRM Status ${action}`;
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
