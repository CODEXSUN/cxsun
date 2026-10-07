import { type Kysely, type Selectable } from "kysely";
import type {
  ContactCommunicationDatabase,
  ContactCommunicationInput,
  ContactCommunicationRecord,
  ContactCommunicationRow
} from "./contact-communication.types.js";

export class ContactCommunicationRepository {
  constructor(private readonly database: Kysely<ContactCommunicationDatabase>) {}

  async list(personId: number): Promise<ContactCommunicationRecord[]> {
    const rows = await this.database
      .selectFrom("contact_communication")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactCommunicationRecord | null> {
    const row = await this.database
      .selectFrom("contact_communication")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(
    input: ContactCommunicationInput,
    actor: string
  ): Promise<ContactCommunicationRecord> {
    const result = await this.database
      .insertInto("contact_communication")
      .values({
        person_id: input.personId,
        kind: input.kind,
        value: input.value,
        is_primary: input.isPrimary ? 1 : 0,
        is_whatsapp: input.isWhatsapp ? 1 : 0,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactCommunicationInput,
    actor: string
  ): Promise<ContactCommunicationRecord> {
    await this.database
      .updateTable("contact_communication")
      .set({
        person_id: input.personId,
        kind: input.kind,
        value: input.value,
        is_primary: input.isPrimary ? 1 : 0,
        is_whatsapp: input.isWhatsapp ? 1 : 0,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactCommunicationRecord> {
    await this.database
      .updateTable("contact_communication")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactCommunicationRow>): ContactCommunicationRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    kind: row.kind,
    value: row.value,
    isPrimary: Boolean(row.is_primary),
    isWhatsapp: Boolean(row.is_whatsapp),
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
