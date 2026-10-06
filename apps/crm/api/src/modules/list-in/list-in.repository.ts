import { sql, type Kysely, type Selectable } from "kysely";
import type { ListInDatabase, ListInInput, ListInRecord, ListInRow } from "./list-in.types.js";

export class ListInRepository {
  constructor(private readonly database: Kysely<ListInDatabase>) {}

  async list(): Promise<ListInRecord[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_lists")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("id")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ListInRecord | null> {
    const row = await this.database
      .selectFrom("crm_enquiry_lists")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ListInInput, actor: string) {
    const result = await this.database
      .insertInto("crm_enquiry_lists")
      .values({
        name: input.name,
        sort_order: input.sortOrder,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(id: number, input: ListInInput, actor: string) {
    await this.database
      .updateTable("crm_enquiry_lists")
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
      .updateTable("crm_enquiry_lists")
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
      FROM crm_enquiries WHERE list_in_id=${id}`.execute(this.database);
    return Number(result.rows[0]?.count ?? 0);
  }

  async forceDelete(id: number) {
    const record = await this.get(id);
    if (record) await this.database.deleteFrom("crm_enquiry_lists").where("id", "=", id).execute();
    return record;
  }
}

function toRecord(row: Selectable<ListInRow>): ListInRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    status: row.status,
    sortOrder: row.sort_order,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
