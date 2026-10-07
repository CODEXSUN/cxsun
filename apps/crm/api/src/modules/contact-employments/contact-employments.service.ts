import { AppError } from "@cxsun/framework/errors";
import { ContactEmploymentsRepository } from "./contact-employments.repository.js";
import type { ContactEmploymentsInput } from "./contact-employments.types.js";

export class ContactEmploymentsService {
  constructor(
    private readonly repository: ContactEmploymentsRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactEmployments record was not found.");
    return record;
  }
  async create(input: ContactEmploymentsInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactEmploymentsInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactEmploymentsInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
  }
}
