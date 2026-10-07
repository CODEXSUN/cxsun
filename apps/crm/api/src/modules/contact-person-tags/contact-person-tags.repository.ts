import { type Kysely, type Selectable } from "kysely";
import type {
  ContactPersonTagsDatabase,
  ContactPersonTagsInput,
  ContactPersonTagsRecord,
  ContactPersonTagsRow
} from "./contact-person-tags.types.js";

export class ContactPersonTagsRepository {
  constructor(private readonly database: Kysely<ContactPersonTagsDatabase>) {}

  async list(personId: number): Promise<ContactPersonTagsRecord[]> {
    const rows = await this.database
      .selectFrom("contact_person_tags")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactPersonTagsRecord | null> {
    const row = await this.database
      .selectFrom("contact_person_tags")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactPersonTagsInput, actor: string): Promise<ContactPersonTagsRecord> {
    const result = await this.database
      .insertInto("contact_person_tags")
      .values({
        person_id: input.personId,
        tag_id: input.tagId,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactPersonTagsInput,
    actor: string
  ): Promise<ContactPersonTagsRecord> {
    await this.database
      .updateTable("contact_person_tags")
      .set({
        person_id: input.personId,
        tag_id: input.tagId,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactPersonTagsRecord> {
    await this.database
      .updateTable("contact_person_tags")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactPersonTagsRow>): ContactPersonTagsRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    tagId: row.tag_id,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
