import { sql, type Kysely, type Selectable } from "kysely";
import type {
  PriorityDatabase,
  PriorityInput,
  PriorityRecord,
  PriorityRow
} from "./priority.types.js";

export class PriorityRepository {
  constructor(private readonly database: Kysely<PriorityDatabase>) {}

  async list(): Promise<PriorityRecord[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_priorities")
      .selectAll()
      .orderBy("sort_order")
      .orderBy("id")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<PriorityRecord | null> {
    const row = await this.database
      .selectFrom("crm_enquiry_priorities")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async findByCode(code: string): Promise<PriorityRecord | null> {
    const row = await this.database
      .selectFrom("crm_enquiry_priorities")
      .selectAll()
      .where("code", "=", code)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: PriorityInput, actor: string, code: string) {
    const result = await this.database
      .insertInto("crm_enquiry_priorities")
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

  async update(id: number, input: PriorityInput, actor: string) {
    await this.database
      .updateTable("crm_enquiry_priorities")
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
      .updateTable("crm_enquiry_priorities")
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
      FROM crm_enquiries WHERE priority_id=${id}`.execute(this.database);
    return Number(result.rows[0]?.count ?? 0);
  }

  async forceDelete(id: number) {
    const record = await this.get(id);
    if (record)
      await this.database.deleteFrom("crm_enquiry_priorities").where("id", "=", id).execute();
    return record;
  }
}

function toRecord(row: Selectable<PriorityRow>): PriorityRecord {
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
