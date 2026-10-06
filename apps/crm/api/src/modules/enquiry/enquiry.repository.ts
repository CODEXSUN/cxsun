import type { Kysely, Selectable } from "kysely";
import type { EnquiryDatabase, EnquiryInput, EnquiryRecord, EnquiryRow } from "./enquiry.types.js";

type PersistedRow = Selectable<EnquiryRow>;

export class EnquiryRepository {
  constructor(private readonly database: Kysely<EnquiryDatabase>) {}

  async list(search = "") {
    let query = this.database.selectFrom("crm_enquiries").selectAll();
    if (search) {
      const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      const reference = search.trim().replace(/^#/u, "");
      const enquiryNo = /^\d+$/u.test(reference) ? Number(reference) : null;
      query = query.where((expression) =>
        expression.or([
          expression("title", "like", term),
          expression("description", "like", term),
          expression("captured_name", "like", term),
          expression("captured_email", "like", term),
          expression("captured_phone", "like", term),
          ...(enquiryNo !== null && Number.isSafeInteger(enquiryNo)
            ? [expression("enquiry_no", "=", enquiryNo)]
            : [])
        ])
      );
    }
    return (await query.orderBy("enquiry_no", "desc").execute()).map(toRecord);
  }

  async get(id: number) {
    const row = await this.database
      .selectFrom("crm_enquiries")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();
    return row ? toRecord(row) : null;
  }

  async create(input: EnquiryInput, actor: string) {
    const id = await this.database.transaction().execute(async (transaction) => {
      const enquiryNo = await this.reserveNextNumber(transaction);
      const result = await transaction
        .insertInto("crm_enquiries")
        .values({ ...toRow(input), enquiry_no: enquiryNo, created_by: actor })
        .executeTakeFirstOrThrow();
      return Number(result.insertId);
    });
    return this.get(id);
  }

  async update(id: number, input: EnquiryInput) {
    await this.database
      .updateTable("crm_enquiries")
      .set(toRow(input))
      .where("id", "=", id)
      .execute();
    return this.get(id);
  }

  private async reserveNextNumber(database: Kysely<EnquiryDatabase>) {
    const sequence = await database
      .selectFrom("crm_enquiry_number_sequence")
      .select("next_no")
      .where("id", "=", 1)
      .forUpdate()
      .executeTakeFirstOrThrow();
    await database
      .updateTable("crm_enquiry_number_sequence")
      .set({ next_no: sequence.next_no + 1 })
      .where("id", "=", 1)
      .execute();
    return sequence.next_no;
  }
}

function toRow(input: EnquiryInput) {
  return {
    title: input.title,
    description: input.description,
    contact_id: input.contactId,
    captured_name: input.capturedName,
    captured_email: input.capturedEmail,
    captured_phone: input.capturedPhone,
    source: input.source,
    source_reference: input.sourceReference,
    list_in: input.listIn,
    status: input.status,
    priority: input.priority,
    assigned_user_id: input.assignedUserId,
    enquired_at: new Date(input.enquiredAt).toISOString().slice(0, 19).replace("T", " "),
    due_date: input.dueDate,
    closed_reason: input.closedReason
  };
}

function toRecord(row: PersistedRow): EnquiryRecord {
  return {
    id: row.id,
    enquiryNo: row.enquiry_no,
    uuid: row.uuid,
    title: row.title,
    description: row.description,
    contactId: row.contact_id,
    contactName: null,
    capturedName: row.captured_name,
    capturedEmail: row.captured_email,
    capturedPhone: row.captured_phone,
    source: row.source,
    sourceReference: row.source_reference,
    listIn: row.list_in,
    status: row.status,
    priority: row.priority,
    assignedUserId: row.assigned_user_id,
    enquiredAt: toIso(row.enquired_at),
    dueDate: row.due_date ? toDate(row.due_date) : null,
    closedReason: row.closed_reason,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(text.endsWith("Z") ? text : `${text}Z`).toISOString();
}

function toDate(value: unknown) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}
