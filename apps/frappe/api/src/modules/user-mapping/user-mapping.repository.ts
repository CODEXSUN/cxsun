import { sql, type Kysely } from "kysely";
import { createHash } from "node:crypto";
import type { FrappeUserMappingDatabase, FrappeUserMappingRow } from "./user-mapping.types.js";

type SaveRow = Pick<
  FrappeUserMappingRow,
  "local_user_id" | "frappe_user_id" | "frappe_email" | "employee_code" | "connection_hash"
>;

export class FrappeUserMappingRepository {
  constructor(private readonly database: Kysely<FrappeUserMappingDatabase>) {}

  list() {
    return this.database
      .selectFrom("frappe_user_mappings")
      .selectAll()
      .orderBy("local_user_id")
      .execute();
  }

  get(localUserId: number) {
    return this.database
      .selectFrom("frappe_user_mappings")
      .selectAll()
      .where("local_user_id", "=", localUserId)
      .executeTakeFirst();
  }

  async save(input: SaveRow) {
    return this.database.transaction().execute(async (database) => {
      const repository = new FrappeUserMappingRepository(database);
      const existing = await repository.get(input.local_user_id);
      if (existing) {
        await database
          .updateTable("frappe_user_mappings")
          .set({
            frappe_user_id: input.frappe_user_id,
            frappe_email: input.frappe_email,
            employee_code: input.employee_code,
            connection_hash: input.connection_hash,
            verified_at: new Date().toISOString().slice(0, 19).replace("T", " ")
          })
          .where("local_user_id", "=", input.local_user_id)
          .execute();
      } else {
        await database.insertInto("frappe_user_mappings").values(input).execute();
      }
      return { row: (await repository.get(input.local_user_id))!, created: !existing };
    });
  }

  async remove(localUserId: number) {
    const current = await this.get(localUserId);
    if (!current) return null;
    await this.database
      .deleteFrom("frappe_user_mappings")
      .where("local_user_id", "=", localUserId)
      .execute();
    return current;
  }
}

export async function mappedEmployeeCodeForLocalUser(
  database: Kysely<FrappeUserMappingDatabase>,
  localEmail: string,
  baseUrl: string
) {
  if (!baseUrl) return null;
  const hash = createHash("sha256").update(new URL(baseUrl).origin.toLowerCase()).digest("hex");
  const result = await sql<{ employee_code: string | null }>`SELECT mapping.employee_code
    FROM frappe_user_mappings mapping
    INNER JOIN app_users local_user ON local_user.id=mapping.local_user_id
    WHERE LOWER(local_user.email)=LOWER(${localEmail}) AND local_user.status='active'
      AND mapping.connection_hash=${hash} LIMIT 1`.execute(database);
  return result.rows[0]?.employee_code ?? null;
}

export async function mappedLocalUserForEmployeeCode(
  database: Kysely<FrappeUserMappingDatabase>,
  employeeCode: string,
  baseUrl: string
) {
  if (!baseUrl || !employeeCode) return null;
  const hash = createHash("sha256").update(new URL(baseUrl).origin.toLowerCase()).digest("hex");
  const result = await sql<{ local_user_id: number }>`SELECT mapping.local_user_id
    FROM frappe_user_mappings mapping
    INNER JOIN app_users local_user ON local_user.id=mapping.local_user_id
    WHERE mapping.employee_code=${employeeCode} AND local_user.status='active'
      AND mapping.connection_hash=${hash} LIMIT 1`.execute(database);
  return result.rows[0]?.local_user_id ?? null;
}
