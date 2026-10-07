import { type Kysely, type Selectable } from "kysely";
import type {
  ContactPreferencesDatabase,
  ContactPreferencesInput,
  ContactPreferencesRecord,
  ContactPreferencesRow
} from "./contact-preferences.types.js";

export class ContactPreferencesRepository {
  constructor(private readonly database: Kysely<ContactPreferencesDatabase>) {}

  async list(personId: number): Promise<ContactPreferencesRecord[]> {
    const rows = await this.database
      .selectFrom("contact_preferences")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactPreferencesRecord | null> {
    const row = await this.database
      .selectFrom("contact_preferences")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactPreferencesInput, actor: string): Promise<ContactPreferencesRecord> {
    const result = await this.database
      .insertInto("contact_preferences")
      .values({
        person_id: input.personId,
        preferred_channel: input.preferredChannel,
        preferred_language: input.preferredLanguage,
        preferred_time: input.preferredTime,
        communication_frequency: input.communicationFrequency,
        communication_permission: input.communicationPermission,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactPreferencesInput,
    actor: string
  ): Promise<ContactPreferencesRecord> {
    await this.database
      .updateTable("contact_preferences")
      .set({
        person_id: input.personId,
        preferred_channel: input.preferredChannel,
        preferred_language: input.preferredLanguage,
        preferred_time: input.preferredTime,
        communication_frequency: input.communicationFrequency,
        communication_permission: input.communicationPermission,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactPreferencesRecord> {
    await this.database
      .updateTable("contact_preferences")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactPreferencesRow>): ContactPreferencesRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    preferredChannel: row.preferred_channel,
    preferredLanguage: row.preferred_language,
    preferredTime: row.preferred_time,
    communicationFrequency: row.communication_frequency,
    communicationPermission: row.communication_permission,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
