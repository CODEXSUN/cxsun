import { sql, type Kysely } from "kysely";
import { randomBytes } from "node:crypto";
import { AppError } from "@cxsun/framework/errors";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  TenantUserRole,
  TenantUserRoleListFilters,
  TenantUserRoleSavePayload,
  TenantUserRoleStatus
} from "./tenant-user-role.types.js";
type Row = {
  id: number;
  is_protected: boolean | number;
  role_id: number;
  role_key: string;
  role_label: string;
  status: TenantUserRoleStatus;
  user_email: string;
  user_id: number;
  user_name: string;
  uuid: string;
};
export class TenantUserRoleRepository {
  constructor(private database: Kysely<TenantDatabase>) {}
  async list(f: TenantUserRoleListFilters = {}) {
    const term = `%${(f.search ?? "").trim().toLowerCase()}%`;
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM app_user_roles ur INNER JOIN app_users u ON u.id=ur.user_id INNER JOIN app_roles r ON r.id=ur.role_id WHERE (${f.search ?? ""}='' OR LOWER(u.name) LIKE ${term} OR LOWER(u.email) LIKE ${term} OR LOWER(r.label) LIKE ${term}) ORDER BY u.name,r.label`.execute(
        this.database
      );
    return r.rows.map(map);
  }
  async find(id: string | number) {
    const r =
      await sql<Row>`SELECT ur.id,ur.uuid,ur.user_id,ur.role_id,ur.status,ur.is_protected,u.name user_name,u.email user_email,r.label role_label,r.\`key\` role_key FROM app_user_roles ur INNER JOIN app_users u ON u.id=ur.user_id INNER JOIN app_roles r ON r.id=ur.role_id WHERE ur.id=${Number(id)} LIMIT 1`.execute(
        this.database
      );
    return r.rows[0] ? map(r.rows[0]) : null;
  }
  async parents(v: TenantUserRoleSavePayload) {
    const r = await sql<{
      role_count: number | string;
      user_count: number | string;
    }>`SELECT (SELECT COUNT(*) FROM app_users WHERE id=${v.userId} AND status='active') user_count,(SELECT COUNT(*) FROM app_roles WHERE id=${v.roleId} AND status='active') role_count`.execute(
      this.database
    );
    return {
      role: Boolean(Number(r.rows[0]?.role_count ?? 0)),
      user: Boolean(Number(r.rows[0]?.user_count ?? 0))
    };
  }
  async create(v: TenantUserRoleSavePayload, uuid: string) {
    const r =
      await sql`INSERT INTO app_user_roles (uuid,user_id,role_id,status,is_protected) VALUES (${uuid},${v.userId},${v.roleId},${v.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(r.insertId)))!;
  }
  async update(id: number, v: TenantUserRoleSavePayload) {
    await sql`UPDATE app_user_roles SET user_id=${v.userId},role_id=${v.roleId},status=${v.status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }
  async setStatus(id: number, status: TenantUserRoleStatus) {
    await sql`UPDATE app_user_roles SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async forceDelete(id: number) {
    const r = await this.find(id);
    if (!r) return null;
    await sql`DELETE FROM app_user_roles WHERE id=${id}`.execute(this.database);
    return r;
  }
}
export async function selectUserRole(
  database: Kysely<TenantDatabase>,
  userId: number,
  roleId: number
) {
  const role = await database
    .selectFrom("app_roles")
    .select("id")
    .where("id", "=", roleId)
    .where("status", "=", "active")
    .executeTakeFirst();
  if (!role) throw AppError.validation("Select an active role.");

  const assignments = await database
    .selectFrom("app_user_roles")
    .select(["id", "role_id", "status", "is_protected"])
    .where("user_id", "=", userId)
    .orderBy("updated_at", "desc")
    .orderBy("id", "desc")
    .execute();
  const current = assignments.find((assignment) => assignment.status === "active");
  const selected = assignments.find((assignment) => Number(assignment.role_id) === roleId);
  if (selected?.status === "active") {
    await database
      .updateTable("app_user_roles")
      .set({ updated_at: new Date() })
      .where("id", "=", selected.id)
      .execute();
    return false;
  }
  if (current?.is_protected) {
    throw AppError.forbidden("Protected user-role assignments cannot be changed.");
  }
  if (selected) {
    if (current) {
      await database
        .updateTable("app_user_roles")
        .set({ status: "inactive", updated_at: new Date() })
        .where("id", "=", current.id)
        .execute();
    }
    await database
      .updateTable("app_user_roles")
      .set({ status: "active", updated_at: new Date() })
      .where("id", "=", selected.id)
      .execute();
  } else if (current) {
    await database
      .updateTable("app_user_roles")
      .set({ role_id: roleId, updated_at: new Date() })
      .where("id", "=", current.id)
      .execute();
  } else {
    await database
      .insertInto("app_user_roles")
      .values({
        uuid: randomBytes(4).toString("hex"),
        user_id: userId,
        role_id: roleId,
        status: "active",
        is_protected: false
      })
      .execute();
  }
  return true;
}
function map(r: Row): TenantUserRole {
  return {
    id: Number(r.id),
    isProtected: Boolean(r.is_protected),
    roleId: Number(r.role_id),
    roleKey: r.role_key,
    roleLabel: r.role_label,
    status: r.status,
    userEmail: r.user_email,
    userId: Number(r.user_id),
    userName: r.user_name,
    uuid: r.uuid
  };
}
