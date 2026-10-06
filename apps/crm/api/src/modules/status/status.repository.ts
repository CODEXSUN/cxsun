import { sql, type Kysely, type Selectable } from "kysely";
import type { StatusDatabase, StatusInput, StatusRecord, StatusRow } from "./status.types.js";

export class StatusRepository {
  constructor(private readonly database: Kysely<StatusDatabase>) {}

  async list(): Promise<StatusRecord[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_statuses")
      .selectAll()
      .orderBy("status")
      .orderBy("sort_order")
      .orderBy("id")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<StatusRecord | null> {
    const row = await this.database
      .selectFrom("crm_enquiry_statuses")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async findByCode(code: string): Promise<StatusRecord | null> {
    const row = await this.database
      .selectFrom("crm_enquiry_statuses")
      .selectAll()
      .where("code", "=", code)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: StatusInput, actor: string, code: string) {
    const result = await this.database
      .insertInto("crm_enquiry_statuses")
      .values({
        name: input.name,
        code,
        sort_order: input.sortOrder,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(id: number, input: StatusInput, actor: string) {
    await this.database
      .updateTable("crm_enquiry_statuses")
      .set({
        name: input.name,
        sort_order: input.sortOrder,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string) {
    await this.database
      .updateTable("crm_enquiry_statuses")
      .set({
        status: active ? "active" : "inactive",
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async usageCount(id: number): Promise<number> {
    const result = await sql<{ count: number }>`SELECT COUNT(*) AS count
      FROM crm_enquiries WHERE status_id=${id}`.execute(this.database);
    return Number(result.rows[0]?.count ?? 0);
  }

  async forceDelete(id: number) {
    const record = await this.get(id);
    if (record)
      await this.database.deleteFrom("crm_enquiry_statuses").where("id", "=", id).execute();
    return record;
  }
}

function toRecord(row: Selectable<StatusRow>): StatusRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    code: row.code,
    status: row.status,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
