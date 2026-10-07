import { type Kysely, type Selectable } from "kysely";
import type {
  ContactRelationshipsDatabase,
  ContactRelationshipsInput,
  ContactRelationshipsRecord,
  ContactRelationshipsRow
} from "./contact-relationships.types.js";

export class ContactRelationshipsRepository {
  constructor(private readonly database: Kysely<ContactRelationshipsDatabase>) {}

  async list(customerContactId: number): Promise<ContactRelationshipsRecord[]> {
    const rows = await this.database
      .selectFrom("contact_relationships")
      .selectAll()
      .where("customer_contact_id", "=", customerContactId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactRelationshipsRecord | null> {
    const row = await this.database
      .selectFrom("contact_relationships")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(
    input: ContactRelationshipsInput,
    actor: string
  ): Promise<ContactRelationshipsRecord> {
    const result = await this.database
      .insertInto("contact_relationships")
      .values({
        customer_contact_id: input.customerContactId,
        person_a_id: input.personAId,
        person_b_id: input.personBId,
        relationship_type: input.relationshipType,
        relationship_strength: input.relationshipStrength,
        notes: input.notes,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactRelationshipsInput,
    actor: string
  ): Promise<ContactRelationshipsRecord> {
    await this.database
      .updateTable("contact_relationships")
      .set({
        customer_contact_id: input.customerContactId,
        person_a_id: input.personAId,
        person_b_id: input.personBId,
        relationship_type: input.relationshipType,
        relationship_strength: input.relationshipStrength,
        notes: input.notes,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactRelationshipsRecord> {
    await this.database
      .updateTable("contact_relationships")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactRelationshipsRow>): ContactRelationshipsRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    customerContactId: row.customer_contact_id,
    personAId: row.person_a_id,
    personBId: row.person_b_id,
    relationshipType: row.relationship_type,
    relationshipStrength: row.relationship_strength,
    notes: row.notes,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
