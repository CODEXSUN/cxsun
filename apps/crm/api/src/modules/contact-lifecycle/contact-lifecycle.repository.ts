import { type Kysely, type Selectable } from "kysely";
import type {
  ContactLifecycleDatabase,
  ContactLifecycleInput,
  ContactLifecycleRecord,
  ContactLifecycleRow
} from "./contact-lifecycle.types.js";

export class ContactLifecycleRepository {
  constructor(private readonly database: Kysely<ContactLifecycleDatabase>) {}

  async list(personId: number): Promise<ContactLifecycleRecord[]> {
    const rows = await this.database
      .selectFrom("contact_lifecycle")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactLifecycleRecord | null> {
    const row = await this.database
      .selectFrom("contact_lifecycle")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactLifecycleInput, actor: string): Promise<ContactLifecycleRecord> {
    const result = await this.database
      .insertInto("contact_lifecycle")
      .values({
        person_id: input.personId,
        previous_status: input.previousStatus,
        new_status: input.newStatus,
        reason: input.reason,
        effective_at: input.effectiveAt,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactLifecycleInput,
    actor: string
  ): Promise<ContactLifecycleRecord> {
    await this.database
      .updateTable("contact_lifecycle")
      .set({
        person_id: input.personId,
        previous_status: input.previousStatus,
        new_status: input.newStatus,
        reason: input.reason,
        effective_at: input.effectiveAt,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactLifecycleRecord> {
    await this.database
      .updateTable("contact_lifecycle")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactLifecycleRow>): ContactLifecycleRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    previousStatus: row.previous_status,
    newStatus: row.new_status,
    reason: row.reason,
    effectiveAt: dateValue(row.effective_at),
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}

function dateValue(value: string | Date | null): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
