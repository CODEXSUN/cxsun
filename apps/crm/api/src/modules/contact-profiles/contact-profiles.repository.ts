import { type Kysely, type Selectable } from "kysely";
import type {
  ContactProfilesDatabase,
  ContactProfilesInput,
  ContactProfilesRecord,
  ContactProfilesRow
} from "./contact-profiles.types.js";

export class ContactProfilesRepository {
  constructor(private readonly database: Kysely<ContactProfilesDatabase>) {}

  async list(coreContactId: number): Promise<ContactProfilesRecord[]> {
    const rows = await this.database
      .selectFrom("contact_profiles")
      .selectAll()
      .where("core_contact_id", "=", coreContactId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactProfilesRecord | null> {
    const row = await this.database
      .selectFrom("contact_profiles")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactProfilesInput, actor: string): Promise<ContactProfilesRecord> {
    const result = await this.database
      .insertInto("contact_profiles")
      .values({
        core_contact_id: input.coreContactId,
        display_name: input.displayName,
        customer_kind: input.customerKind,
        industry_id: input.industryId,
        business_type: input.businessType,
        customer_since: input.customerSince,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactProfilesInput,
    actor: string
  ): Promise<ContactProfilesRecord> {
    await this.database
      .updateTable("contact_profiles")
      .set({
        core_contact_id: input.coreContactId,
        display_name: input.displayName,
        customer_kind: input.customerKind,
        industry_id: input.industryId,
        business_type: input.businessType,
        customer_since: input.customerSince,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactProfilesRecord> {
    await this.database
      .updateTable("contact_profiles")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactProfilesRow>): ContactProfilesRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    coreContactId: row.core_contact_id,
    displayName: row.display_name,
    customerKind: row.customer_kind,
    industryId: row.industry_id,
    businessType: row.business_type,
    customerSince: dateValue(row.customer_since),
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
