import { sql, type Kysely } from "kysely";
import type { TenantDatabase } from "../../database/schema.js";
import type {
  TenantUser,
  TenantUserListFilters,
  TenantUserSavePayload,
  TenantUserStatus
} from "./tenant-user.types.js";

type Row = {
  email: string;
  id: number;
  is_protected: number | boolean;
  name: string;
  status: TenantUserStatus;
  uuid: string;
};
type RoleRow = { user_id: number; role_id: number; role_label: string };

export class TenantUserRepository {
  constructor(private readonly database: Kysely<TenantDatabase>) {}
  async list(filters: TenantUserListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const result = await sql<Row>`SELECT id,uuid,name,email,status,is_protected FROM app_users
      WHERE (${filters.search ?? ""}='' OR LOWER(name) LIKE ${term} OR LOWER(email) LIKE ${term}) ORDER BY name`.execute(
      this.database
    );
    const roles = await this.rolesForUsers(result.rows.map((row) => Number(row.id)));
    return result.rows.map((row) => mapRow(row, roles.get(Number(row.id)) ?? []));
  }
  async find(id: string | number) {
    const result =
      await sql<Row>`SELECT id,uuid,name,email,status,is_protected FROM app_users WHERE id=${Number(id)} LIMIT 1`.execute(
        this.database
      );
    if (!result.rows[0]) return null;
    const roles = await this.rolesForUsers([Number(result.rows[0].id)]);
    return mapRow(result.rows[0], roles.get(Number(result.rows[0].id)) ?? []);
  }
  async create(input: TenantUserSavePayload, uuid: string, passwordHash: string) {
    const result =
      await sql`INSERT INTO app_users (uuid,name,email,password_hash,role,status,is_protected)
      VALUES (${uuid},${input.name},${input.email},${passwordHash},'user',${input.status},FALSE)`.execute(
        this.database
      );
    return (await this.find(Number(result.insertId)))!;
  }
  async update(id: number, input: TenantUserSavePayload, passwordHash?: string) {
    if (passwordHash)
      await sql`UPDATE app_users SET name=${input.name},email=${input.email},password_hash=${passwordHash},status=${input.status} WHERE id=${id}`.execute(
        this.database
      );
    else
      await sql`UPDATE app_users SET name=${input.name},email=${input.email},status=${input.status} WHERE id=${id}`.execute(
        this.database
      );
    return this.find(id);
  }
  async setStatus(id: number, status: TenantUserStatus) {
    await sql`UPDATE app_users SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }
  async dependentCount(id: number) {
    const result = await sql<{
      count: number | string;
    }>`SELECT COUNT(*) count FROM app_user_roles WHERE user_id=${id}`.execute(this.database);
    return Number(result.rows[0]?.count ?? 0);
  }
  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM app_users WHERE id=${id}`.execute(this.database);
    return record;
  }
  private async rolesForUsers(ids: number[]) {
    const roles = new Map<number, TenantUser["roles"]>();
    if (!ids.length) return roles;
    const result = (await this.database
      .selectFrom("app_user_roles as assignment")
      .innerJoin("app_roles as role", "role.id", "assignment.role_id")
      .select([
        "assignment.user_id as user_id",
        "assignment.role_id as role_id",
        "role.label as role_label"
      ])
      .where("assignment.user_id", "in", ids)
      .where("assignment.status", "=", "active")
      .where("role.status", "=", "active")
      .orderBy("assignment.updated_at", "desc")
      .orderBy("assignment.id", "desc")
      .execute()) as RoleRow[];
    for (const row of result) {
      const current = roles.get(Number(row.user_id)) ?? [];
      current.push({ id: Number(row.role_id), label: row.role_label });
      roles.set(Number(row.user_id), current);
    }
    return roles;
  }
}
function mapRow(row: Row, roles: TenantUser["roles"]): TenantUser {
  return {
    email: row.email,
    id: Number(row.id),
    isProtected: Boolean(row.is_protected),
    name: row.name,
    roles,
    status: row.status,
    uuid: row.uuid
  };
}
