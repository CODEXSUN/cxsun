import { type Kysely, type Selectable } from "kysely";
import type {
  ContactNotesDatabase,
  ContactNotesInput,
  ContactNotesRecord,
  ContactNotesRow
} from "./contact-notes.types.js";

export class ContactNotesRepository {
  constructor(private readonly database: Kysely<ContactNotesDatabase>) {}

  async list(personId: number): Promise<ContactNotesRecord[]> {
    const rows = await this.database
      .selectFrom("contact_notes")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactNotesRecord | null> {
    const row = await this.database
      .selectFrom("contact_notes")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactNotesInput, actor: string): Promise<ContactNotesRecord> {
    const result = await this.database
      .insertInto("contact_notes")
      .values({
        person_id: input.personId,
        note_type: input.noteType,
        body: input.body,
        is_important: input.isImportant ? 1 : 0,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(id: number, input: ContactNotesInput, actor: string): Promise<ContactNotesRecord> {
    await this.database
      .updateTable("contact_notes")
      .set({
        person_id: input.personId,
        note_type: input.noteType,
        body: input.body,
        is_important: input.isImportant ? 1 : 0,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactNotesRecord> {
    await this.database
      .updateTable("contact_notes")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactNotesRow>): ContactNotesRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    noteType: row.note_type,
    body: row.body,
    isImportant: Boolean(row.is_important),
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
