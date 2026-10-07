import { type Kysely, type Selectable } from "kysely";
import type {
  ContactClassificationsDatabase,
  ContactClassificationsInput,
  ContactClassificationsRecord,
  ContactClassificationsRow
} from "./contact-classifications.types.js";

export class ContactClassificationsRepository {
  constructor(private readonly database: Kysely<ContactClassificationsDatabase>) {}

  async list(personId: number): Promise<ContactClassificationsRecord[]> {
    const rows = await this.database
      .selectFrom("contact_classifications")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactClassificationsRecord | null> {
    const row = await this.database
      .selectFrom("contact_classifications")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(
    input: ContactClassificationsInput,
    actor: string
  ): Promise<ContactClassificationsRecord> {
    const result = await this.database
      .insertInto("contact_classifications")
      .values({
        person_id: input.personId,
        category: input.category,
        priority_level: input.priorityLevel,
        is_vip: input.isVip ? 1 : 0,
        is_primary_contact: input.isPrimaryContact ? 1 : 0,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactClassificationsInput,
    actor: string
  ): Promise<ContactClassificationsRecord> {
    await this.database
      .updateTable("contact_classifications")
      .set({
        person_id: input.personId,
        category: input.category,
        priority_level: input.priorityLevel,
        is_vip: input.isVip ? 1 : 0,
        is_primary_contact: input.isPrimaryContact ? 1 : 0,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(
    id: number,
    active: boolean,
    actor: string
  ): Promise<ContactClassificationsRecord> {
    await this.database
      .updateTable("contact_classifications")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactClassificationsRow>): ContactClassificationsRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    category: row.category,
    priorityLevel: row.priority_level,
    isVip: Boolean(row.is_vip),
    isPrimaryContact: Boolean(row.is_primary_contact),
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
