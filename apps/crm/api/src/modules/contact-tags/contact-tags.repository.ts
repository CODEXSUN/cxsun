import { type Kysely, type Selectable } from "kysely";
import type {
  ContactTagsDatabase,
  ContactTagsInput,
  ContactTagsRecord,
  ContactTagsRow
} from "./contact-tags.types.js";

export class ContactTagsRepository {
  constructor(private readonly database: Kysely<ContactTagsDatabase>) {}

  async list(): Promise<ContactTagsRecord[]> {
    const rows = await this.database
      .selectFrom("contact_tags")
      .selectAll()
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactTagsRecord | null> {
    const row = await this.database
      .selectFrom("contact_tags")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactTagsInput, actor: string): Promise<ContactTagsRecord> {
    const result = await this.database
      .insertInto("contact_tags")
      .values({
        name: input.name,
        color: input.color,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(id: number, input: ContactTagsInput, actor: string): Promise<ContactTagsRecord> {
    await this.database
      .updateTable("contact_tags")
      .set({
        name: input.name,
        color: input.color,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactTagsRecord> {
    await this.database
      .updateTable("contact_tags")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactTagsRow>): ContactTagsRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    name: row.name,
    color: row.color,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
