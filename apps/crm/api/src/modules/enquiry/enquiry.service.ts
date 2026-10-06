import { AppError } from "@cxsun/framework/errors";
import { EnquiryRepository } from "./enquiry.repository.js";
import type { EnquiryInput, EnquiryRecord } from "./enquiry.types.js";

export type EnquiryRelations = {
  contact: (id: number) => Promise<{ name: string } | null>;
  resolveOrCreateCustomer: (input: {
    name: string | null;
    mobile: string | null;
  }) => Promise<{ id: number; name: string }>;
  user: (id: number) => Promise<boolean>;
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

  async update(id: number, input: EnquiryInput) {
    await this.get(id);
    const prepared = await this.prepare(input);
    const record = await this.repository.update(id, prepared);
    if (!record) throw AppError.notFound("Enquiry was not found.");
    return this.withContact(record);
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
