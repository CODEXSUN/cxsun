import { type Kysely, type Selectable } from "kysely";
import type {
  ContactPeopleDatabase,
  ContactPeopleInput,
  ContactPeopleRecord,
  ContactPeopleRow
} from "./contact-people.types.js";

export class ContactPeopleRepository {
  constructor(private readonly database: Kysely<ContactPeopleDatabase>) {}

  async list(customerContactId: number): Promise<ContactPeopleRecord[]> {
    const rows = await this.database
      .selectFrom("contact_people")
      .selectAll()
      .where("customer_contact_id", "=", customerContactId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactPeopleRecord | null> {
    const row = await this.database
      .selectFrom("contact_people")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactPeopleInput, actor: string): Promise<ContactPeopleRecord> {
    const result = await this.database
      .insertInto("contact_people")
      .values({
        customer_contact_id: input.customerContactId,
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: input.displayName,
        salutation: input.salutation,
        profile_photo_ref: input.profilePhotoRef,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(id: number, input: ContactPeopleInput, actor: string): Promise<ContactPeopleRecord> {
    await this.database
      .updateTable("contact_people")
      .set({
        customer_contact_id: input.customerContactId,
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: input.displayName,
        salutation: input.salutation,
        profile_photo_ref: input.profilePhotoRef,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactPeopleRecord> {
    await this.database
      .updateTable("contact_people")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactPeopleRow>): ContactPeopleRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    customerContactId: row.customer_contact_id,
    firstName: row.first_name,
    lastName: row.last_name,
    displayName: row.display_name,
    salutation: row.salutation,
    profilePhotoRef: row.profile_photo_ref,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
