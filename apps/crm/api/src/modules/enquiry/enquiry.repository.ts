import type { Kysely, Selectable } from "kysely";
import type {
  EnquiryComment,
  EnquiryCommentRow,
  EnquiryDatabase,
  EnquiryInput,
  EnquiryRecord,
  EnquiryRow
} from "./enquiry.types.js";
import { sanitizeCommentHtml } from "./enquiry.comment-html.js";

type PersistedRow = Selectable<EnquiryRow> & {
  list_name: string | null;
  status_code: string;
  status_name: string;
  priority_code: string;
  priority_name: string;
};

export class EnquiryRepository {
  constructor(private readonly database: Kysely<EnquiryDatabase>) {}

  async list(search = "") {
    let query = this.detailQuery();
    if (search) {
      const term = `%${search.replace(/[\\%_]/g, "\\$&")}%`;
      const reference = search.trim().replace(/^#/u, "");
      const enquiryNo = /^\d+$/u.test(reference) ? Number(reference) : null;
      query = query.where((expression) =>
        expression.or([
          expression("enquiry.title", "like", term),
          expression("enquiry.description", "like", term),
          expression("enquiry.captured_name", "like", term),
          expression("enquiry.captured_email", "like", term),
          expression("enquiry.captured_phone", "like", term),
          ...(enquiryNo !== null && Number.isSafeInteger(enquiryNo)
            ? [expression("enquiry.enquiry_no", "=", enquiryNo)]
            : [])
        ])
      );
    }
    return (await query.orderBy("enquiry.enquiry_no", "desc").execute()).map(toRecord);
  }

  async get(id: number) {
    const row = await this.detailQuery()
      .where("enquiry.id", "=", id)
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
      const enquiryId = Number(result.insertId);
      if (input.description?.trim()) {
        await transaction
          .insertInto("crm_enquiry_comments")
          .values({
            enquiry_id: enquiryId,
            parent_id: null,
            body: input.description.trim(),
            status: "active",
            created_by: actor
          })
          .execute();
      }
      await insertEnquiryActivity(
        transaction,
        enquiryId,
        "created",
        `Enquiry #${enquiryNo} created`,
        actor
      );
      return enquiryId;
    });
    return this.get(id);
  }

  async update(id: number, input: EnquiryInput, actor: string, details = "Enquiry updated") {
    await this.database.transaction().execute(async (transaction) => {
      await transaction
        .updateTable("crm_enquiries")
        .set(toRow(input))
        .where("id", "=", id)
        .execute();
      await insertEnquiryActivity(transaction, id, "updated", details, actor);
    });
    return this.get(id);
  }

  async listComments(enquiryId: number): Promise<EnquiryComment[]> {
    const rows = await this.database
      .selectFrom("crm_enquiry_comments")
      .selectAll()
      .where("enquiry_id", "=", enquiryId)
      .orderBy("created_at")
      .orderBy("id")
      .execute();
    return rows.map(toComment);
  }

  async getComment(id: number) {
    return this.database
      .selectFrom("crm_enquiry_comments")
      .select(["id", "enquiry_id", "parent_id"])
      .where("id", "=", id)
      .executeTakeFirst();
  }

  async addComment(
    enquiryId: number,
    parentId: number | null,
    body: string,
    bodyFormat: "plain" | "html",
    actor: string
  ) {
    const result = await this.database.transaction().execute(async (transaction) => {
      const inserted = await transaction
        .insertInto("crm_enquiry_comments")
        .values({
          enquiry_id: enquiryId,
          parent_id: parentId,
          body,
          body_format: bodyFormat,
          status: "active",
          created_by: actor
        })
        .executeTakeFirstOrThrow();
      await insertEnquiryActivity(
        transaction,
        enquiryId,
        parentId ? "reply-added" : "comment-added",
        parentId ? "Reply added" : "Comment added",
        actor
      );
      return inserted;
    });
    const row = await this.database
      .selectFrom("crm_enquiry_comments")
      .selectAll()
      .where("id", "=", Number(result.insertId))
      .executeTakeFirstOrThrow();
    return toComment(row);
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

  private detailQuery() {
    return this.database.selectFrom("crm_enquiries as enquiry")
      .leftJoin("crm_enquiry_lists as list", "list.id", "enquiry.list_in_id")
      .innerJoin("crm_enquiry_statuses as status_master", "status_master.id", "enquiry.status_id")
      .innerJoin("crm_enquiry_priorities as priority_master", "priority_master.id", "enquiry.priority_id")
      .selectAll("enquiry")
      .select([
        "list.name as list_name",
        "status_master.code as status_code",
        "status_master.name as status_name",
        "priority_master.code as priority_code",
        "priority_master.name as priority_name"
      ]);
  }
}

export async function insertEnquiryActivity(
  database: Kysely<EnquiryDatabase>,
  enquiryId: number,
  action: string,
  details: string,
  actor: string
) {
  await database
    .insertInto("crm_enquiry_activity")
    .values({
      enquiry_id: enquiryId,
      action,
      details,
      status: "active",
      created_by: actor
    })
    .execute();
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
    list_in_id: input.listInId,
    status_id: input.statusId,
    priority_id: input.priorityId,
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
    listInId: row.list_in_id,
    statusId: row.status_id,
    priorityId: row.priority_id,
    listIn: row.list_name,
    status: row.status_code,
    statusName: row.status_name,
    priority: row.priority_code,
    priorityName: row.priority_name,
    assignedUserId: row.assigned_user_id,
    enquiredAt: toIso(row.enquired_at),
    dueDate: row.due_date ? toDate(row.due_date) : null,
    closedReason: row.closed_reason,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

function toComment(row: Selectable<EnquiryCommentRow>): EnquiryComment {
  return {
    id: row.id,
    uuid: row.uuid,
    enquiryId: row.enquiry_id,
    parentId: row.parent_id,
    body: row.body_format === "html" ? sanitizeCommentHtml(row.body) : row.body,
    bodyFormat: row.body_format,
    createdBy: row.created_by,
    createdAt: toIso(row.created_at)
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
