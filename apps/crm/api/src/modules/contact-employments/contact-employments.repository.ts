import { type Kysely, type Selectable } from "kysely";
import type {
  ContactEmploymentsDatabase,
  ContactEmploymentsInput,
  ContactEmploymentsRecord,
  ContactEmploymentsRow
} from "./contact-employments.types.js";

export class ContactEmploymentsRepository {
  constructor(private readonly database: Kysely<ContactEmploymentsDatabase>) {}

  async list(personId: number): Promise<ContactEmploymentsRecord[]> {
    const rows = await this.database
      .selectFrom("contact_employments")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactEmploymentsRecord | null> {
    const row = await this.database
      .selectFrom("contact_employments")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactEmploymentsInput, actor: string): Promise<ContactEmploymentsRecord> {
    const result = await this.database
      .insertInto("contact_employments")
      .values({
        person_id: input.personId,
        job_title: input.jobTitle,
        department: input.department,
        seniority: input.seniority,
        work_location: input.workLocation,
        employment_status: input.employmentStatus,
        joining_date: input.joiningDate,
        end_date: input.endDate,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactEmploymentsInput,
    actor: string
  ): Promise<ContactEmploymentsRecord> {
    await this.database
      .updateTable("contact_employments")
      .set({
        person_id: input.personId,
        job_title: input.jobTitle,
        department: input.department,
        seniority: input.seniority,
        work_location: input.workLocation,
        employment_status: input.employmentStatus,
        joining_date: input.joiningDate,
        end_date: input.endDate,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactEmploymentsRecord> {
    await this.database
      .updateTable("contact_employments")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactEmploymentsRow>): ContactEmploymentsRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    jobTitle: row.job_title,
    department: row.department,
    seniority: row.seniority,
    workLocation: row.work_location,
    employmentStatus: row.employment_status,
    joiningDate: dateValue(row.joining_date),
    endDate: dateValue(row.end_date),
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
