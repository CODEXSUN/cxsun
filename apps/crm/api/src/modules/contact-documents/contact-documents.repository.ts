import { type Kysely, type Selectable } from "kysely";
import type {
  ContactDocumentsDatabase,
  ContactDocumentsInput,
  ContactDocumentsRecord,
  ContactDocumentsRow
} from "./contact-documents.types.js";

export class ContactDocumentsRepository {
  constructor(private readonly database: Kysely<ContactDocumentsDatabase>) {}

  async list(personId: number): Promise<ContactDocumentsRecord[]> {
    const rows = await this.database
      .selectFrom("contact_documents")
      .selectAll()
      .where("person_id", "=", personId)
      .orderBy("id", "desc")
      .execute();
    return rows.map(toRecord);
  }

  async get(id: number): Promise<ContactDocumentsRecord | null> {
    const row = await this.database
      .selectFrom("contact_documents")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: ContactDocumentsInput, actor: string): Promise<ContactDocumentsRecord> {
    const result = await this.database
      .insertInto("contact_documents")
      .values({
        person_id: input.personId,
        document_type: input.documentType,
        document_name: input.documentName,
        description: input.description,
        document_date: input.documentDate,
        expiry_date: input.expiryDate,
        file_ref: input.fileRef,
        status: "active",
        created_by: actor,
        updated_by: actor
      })
      .executeTakeFirstOrThrow();
    return (await this.get(Number(result.insertId)))!;
  }

  async update(
    id: number,
    input: ContactDocumentsInput,
    actor: string
  ): Promise<ContactDocumentsRecord> {
    await this.database
      .updateTable("contact_documents")
      .set({
        person_id: input.personId,
        document_type: input.documentType,
        document_name: input.documentName,
        description: input.description,
        document_date: input.documentDate,
        expiry_date: input.expiryDate,
        file_ref: input.fileRef,
        updated_by: actor
      })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }

  async setActive(id: number, active: boolean, actor: string): Promise<ContactDocumentsRecord> {
    await this.database
      .updateTable("contact_documents")
      .set({ status: active ? "active" : "inactive", updated_by: actor })
      .where("id", "=", id)
      .execute();
    return (await this.get(id))!;
  }
}

function toRecord(row: Selectable<ContactDocumentsRow>): ContactDocumentsRecord {
  const iso = (value: unknown) =>
    value instanceof Date
      ? value.toISOString()
      : new Date(String(value).replace(" ", "T") + "Z").toISOString();
  return {
    id: row.id,
    uuid: row.uuid,
    personId: row.person_id,
    documentType: row.document_type,
    documentName: row.document_name,
    description: row.description,
    documentDate: dateValue(row.document_date),
    expiryDate: dateValue(row.expiry_date),
    fileRef: row.file_ref,
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
