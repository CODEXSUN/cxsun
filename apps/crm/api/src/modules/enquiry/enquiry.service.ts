import { AppError } from "@cxsun/framework/errors";
import { EnquiryRepository } from "./enquiry.repository.js";
import type { EnquiryInput, EnquiryRecord } from "./enquiry.types.js";
import { commentPlainText, sanitizeCommentHtml } from "./enquiry.comment-html.js";

export type EnquiryRelations = {
  contact: (id: number) => Promise<{ name: string } | null>;
  resolveOrCreateCustomer: (input: {
    name: string | null;
    mobile: string | null;
  }) => Promise<{ id: number; name: string }>;
  user: (id: number) => Promise<{ name: string } | null>;
  listIn: (id: number) => Promise<{ name: string } | null>;
  status: (id: number) => Promise<{ name: string } | null>;
  priority: (id: number) => Promise<{ name: string } | null>;
};

export class EnquiryService {
  constructor(
    private readonly repository: EnquiryRepository,
    private readonly relations: EnquiryRelations
  ) {}

  async list(search = "") {
    return Promise.all(
      (await this.repository.list(search)).map((record) => this.withContact(record))
    );
  }

  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    return this.withContact(record);
  }

  async create(input: EnquiryInput, actor: string) {
    const prepared = await this.prepare(input);
    const record = await this.repository.create(prepared, actor);
    if (!record) throw AppError.notFound("Enquiry could not be created.");
    return this.withContact(record);
  }

  async update(id: number, input: EnquiryInput, actor: string) {
    await this.get(id);
    const prepared = await this.prepare(input);
    const record = await this.repository.update(id, prepared, actor);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    return this.withContact(record);
  }

  async updateProperties(
    id: number,
    patch: {
      listInId?: number | null | undefined;
      priorityId?: number | undefined;
      assignedUserId?: number | null | undefined;
      dueDate?: string | null | undefined;
      statusId?: number | undefined;
    },
    actor: string
  ) {
    const current = await this.get(id);
    const changes = Object.entries(patch).filter(
      ([key, value]) => value !== undefined && current[key as keyof EnquiryRecord] !== value
    );
    if (changes.length === 0) return current;
    const prepared = await this.prepare({
      ...current,
      listInId: patch.listInId === undefined ? current.listInId : patch.listInId,
      priorityId: patch.priorityId === undefined ? current.priorityId : patch.priorityId,
      assignedUserId:
        patch.assignedUserId === undefined ? current.assignedUserId : patch.assignedUserId,
      dueDate: patch.dueDate === undefined ? current.dueDate : patch.dueDate,
      statusId: patch.statusId === undefined ? current.statusId : patch.statusId
    });
    const details = changes.map(([key, value]) => `${key}: ${value ?? "—"}`).join("; ");
    const record = await this.repository.update(id, prepared, actor, details);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    return this.withContact(record);
  }

  async listComments(id: number) {
    await this.get(id);
    return this.repository.listComments(id);
  }

  async overviewActivity(actor: string) {
    return { commentsByYou30Days: await this.repository.commentsByActorInLast30Days(actor) };
  }

  async openNewCall(id: number, actor: string) {
    const record = await this.repository.openNewCall(id, actor);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    return this.withContact(record);
  }

  async addComment(
    id: number,
    body: string,
    parentId: number | null,
    actor: string,
    bodyFormat: "plain" | "html" = "plain"
  ) {
    await this.get(id);
    const text = bodyFormat === "html" ? sanitizeCommentHtml(body) : body.trim();
    if (!(bodyFormat === "html" ? commentPlainText(text) : text)) {
      throw AppError.validation("Enter a comment.");
    }
    if (parentId !== null) {
      const parent = await this.repository.getComment(parentId);
      if (!parent || parent.enquiry_id !== id || parent.parent_id !== null) {
        throw AppError.validation("Select a comment from this enquiry to reply to.");
      }
    }
    return this.repository.addComment(id, parentId, text, bodyFormat, actor);
  }

  private async prepare(input: EnquiryInput): Promise<EnquiryInput> {
    const title = input.title.trim() || titleFromMessage(input.description);
    if (!title) throw AppError.validation("Enter an enquiry message or title.");
    if (!input.contactId && !input.capturedName?.trim() && !input.capturedPhone?.trim()) {
      throw AppError.validation("Customer name or mobile number is required.");
    }
    if (input.contactId && !(await this.relations.contact(input.contactId))) {
      throw AppError.validation("Select an active Core contact.");
    }
    if (input.assignedUserId && !(await this.relations.user(input.assignedUserId))) {
      throw AppError.validation("Select an active user.");
    }
    if (input.listInId && !(await this.relations.listIn(input.listInId))) {
      throw AppError.validation("Select an active List In record.");
    }
    if (!(await this.relations.status(input.statusId))) {
      throw AppError.validation("Select an active enquiry status.");
    }
    if (!(await this.relations.priority(input.priorityId))) {
      throw AppError.validation("Select an active enquiry priority.");
    }
    if (input.contactId) return { ...input, title };
    const contact = await this.relations.resolveOrCreateCustomer({
      name: input.capturedName,
      mobile: input.capturedPhone
    });
    return {
      ...input,
      title,
      contactId: contact.id,
      capturedName: input.capturedName?.trim() || contact.name
    };
  }

  private async withContact(record: EnquiryRecord): Promise<EnquiryRecord> {
    const contact = record.contactId ? await this.relations.contact(record.contactId) : null;
    return { ...record, contactName: contact?.name ?? null };
  }
}

function titleFromMessage(message: string | null) {
  return Array.from((message ?? "").replace(/\s+/gu, " ").trim())
    .slice(0, 100)
    .join("");
}
