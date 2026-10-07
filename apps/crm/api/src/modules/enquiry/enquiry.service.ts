import { AppError } from "@cxsun/framework/errors";
import { EnquiryRepository } from "./enquiry.repository.js";
import type { EnquiryInput, EnquiryListOptions, EnquiryRecord } from "./enquiry.types.js";
import { commentPlainText, sanitizeCommentHtml } from "./enquiry.comment-html.js";

export type EnquiryRelations = {
  contact: (id: number) => Promise<{ name: string } | null>;
  resolveOrCreateCustomer: (input: {
    name: string | null;
    mobile: string | null;
  }) => Promise<{ id: number; name: string }>;
  user: (id: number) => Promise<{ name: string } | null>;
  listIn: (id: number) => Promise<{ name: string } | null>;
  status: (id: number) => Promise<{ name: string; code: string } | null>;
  priority: (id: number) => Promise<{ name: string } | null>;
};

export class EnquiryService {
  constructor(
    private readonly repository: EnquiryRepository,
    private readonly relations: EnquiryRelations,
    private readonly viewer: Pick<EnquiryListOptions, "actorEmail" | "actorUserId" | "canViewAll">
  ) {}

  async listPage(options: Omit<EnquiryListOptions, keyof typeof this.viewer>) {
    const page = await this.repository.listPage({ ...options, ...this.viewer });
    return {
      ...page,
      items: await Promise.all(page.items.map((record) => this.withContact(record)))
    };
  }

  report(filters: Pick<EnquiryListOptions, "fromAt" | "toAt" | "assignedUserId">) {
    return this.repository.report({
      ...this.viewer,
      scope: "all",
      page: 1,
      pageSize: 1,
      search: "",
      filter: "all",
      ...filters
    });
  }

  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    if (
      !this.viewer.canViewAll &&
      record.assignedUserId !== this.viewer.actorUserId &&
      record.createdBy.toLowerCase() !== this.viewer.actorEmail.toLowerCase()
    ) {
      throw AppError.forbidden("You cannot view this enquiry.");
    }
    return this.withContact(record);
  }

  async create(input: EnquiryInput, actor: string) {
    const prepared = await this.prepare(input, null);
    const record = await this.repository.create(prepared, actor);
    if (!record) throw AppError.notFound("Enquiry could not be created.");
    return this.withContact(record);
  }

  async update(id: number, input: EnquiryInput, actor: string) {
    const current = await this.get(id);
    const prepared = await this.prepare(input, current);
    const record = await this.repository.update(
      id,
      prepared,
      actor,
      "Enquiry updated",
      current.statusId
    );
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
      closedReason?: string | null | undefined;
    },
    actor: string
  ) {
    const current = await this.get(id);
    const changes = Object.entries(patch).filter(
      ([key, value]) => value !== undefined && current[key as keyof EnquiryRecord] !== value
    );
    if (changes.length === 0) return current;
    const prepared = await this.prepare(
      {
        ...current,
        listInId: patch.listInId === undefined ? current.listInId : patch.listInId,
        priorityId: patch.priorityId === undefined ? current.priorityId : patch.priorityId,
        assignedUserId:
          patch.assignedUserId === undefined ? current.assignedUserId : patch.assignedUserId,
        dueDate: patch.dueDate === undefined ? current.dueDate : patch.dueDate,
        statusId: patch.statusId === undefined ? current.statusId : patch.statusId,
        closedReason: patch.closedReason === undefined ? current.closedReason : patch.closedReason
      },
      current
    );
    const details = changes.map(([key, value]) => `${key}: ${value ?? "—"}`).join("; ");
    const record = await this.repository.update(id, prepared, actor, details, current.statusId);
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

  async attention(today: string) {
    const userId = this.viewer.actorUserId;
    if (!userId) return { assignments: [], due: [] };
    const [assignments, due] = await Promise.all([
      this.repository.listAlerts(userId),
      this.repository.dueFollowUps(userId, today)
    ]);
    return { assignments, due: await Promise.all(due.map((record) => this.withContact(record))) };
  }

  summary(today: string) {
    return this.repository.summary(this.viewer, today);
  }

  async readAlert(id: number) {
    const userId = this.viewer.actorUserId;
    if (!userId) throw AppError.forbidden("A tenant user is required.");
    return { read: await this.repository.readAlert(id, userId) };
  }

  async openNewCall(id: number, actor: string) {
    await this.get(id);
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

  private async prepare(input: EnquiryInput, current: EnquiryRecord | null): Promise<EnquiryInput> {
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
    const status = await this.relations.status(input.statusId);
    if (!status) {
      throw AppError.validation("Select an active enquiry status.");
    }
    const terminal = new Set(["won", "lost", "closed"]);
    if (current && current.status !== status.code) {
      if (terminal.has(current.status) && status.code !== "reopen") {
        throw AppError.validation("Re-open this enquiry before changing its status.");
      }
      if (current.status === "new" && terminal.has(status.code)) {
        throw AppError.validation("Open this new call before closing it.");
      }
      if (status.code === "reopen" && !terminal.has(current.status)) {
        throw AppError.validation("Only a completed enquiry can be re-opened.");
      }
    }
    if (terminal.has(status.code) && !input.closedReason?.trim()) {
      throw AppError.validation("Enter an outcome reason before closing this enquiry.");
    }
    if (!(await this.relations.priority(input.priorityId))) {
      throw AppError.validation("Select an active enquiry priority.");
    }
    if (input.contactId)
      return {
        ...input,
        title,
        closedReason: terminal.has(status.code) ? input.closedReason?.trim() || null : null
      };
    const contact = await this.relations.resolveOrCreateCustomer({
      name: input.capturedName,
      mobile: input.capturedPhone
    });
    return {
      ...input,
      title,
      closedReason: terminal.has(status.code) ? input.closedReason?.trim() || null : null,
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
