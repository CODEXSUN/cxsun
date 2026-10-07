import { type Kysely, type Selectable } from "kysely";
import type {
  ContactRolesDatabase,
  ContactRolesInput,
  ContactRolesRecord,
  ContactRolesRow
} from "./contact-roles.types.js";

export class ContactRolesRepository {
  constructor(private readonly database: Kysely<ContactRolesDatabase>) {}

  async list(personId: number): Promise<ContactRolesRecord[]> {
    const rows = await this.database
      .selectFrom("contact_roles")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactRolesRecord | null> {
    const row = await this.database
      .selectFrom("contact_roles")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactRolesInput, actor: string): Promise<ContactRolesRecord> {
    const result = await this.database
      .insertInto("contact_roles")
      .values({
        person_id: input.personId,
        role_name: input.roleName,
        is_primary_role: input.isPrimaryRole ? 1 : 0,
        decision_authority: input.decisionAuthority,
        influence_level: input.influenceLevel,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(id: number, input: ContactRolesInput, actor: string): Promise<ContactRolesRecord> {
    await this.database
      .updateTable("contact_roles")
      .set({
        person_id: input.personId,
        role_name: input.roleName,
        is_primary_role: input.isPrimaryRole ? 1 : 0,
        decision_authority: input.decisionAuthority,
        influence_level: input.influenceLevel,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactRolesRecord> {
    await this.database
      .updateTable("contact_roles")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactRolesRow>): ContactRolesRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    roleName: row.role_name,
    isPrimaryRole: Boolean(row.is_primary_role),
    decisionAuthority: row.decision_authority,
    influenceLevel: row.influence_level,
    status: row.status,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at)
  };
}
