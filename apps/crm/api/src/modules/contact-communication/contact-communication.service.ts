import { AppError } from "@cxsun/framework/errors";
import { ContactCommunicationRepository } from "./contact-communication.repository.js";
import type { ContactCommunicationInput } from "./contact-communication.types.js";

export class ContactCommunicationService {
  constructor(
    private readonly repository: ContactCommunicationRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactCommunication record was not found.");
    return record;
  }
  async create(input: ContactCommunicationInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactCommunicationInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactCommunicationInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
  }
}
