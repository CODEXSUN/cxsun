import { AppError } from "@cxsun/framework/errors";
import { ContactNotesRepository } from "./contact-notes.repository.js";
import type { ContactNotesInput } from "./contact-notes.types.js";

export class ContactNotesService {
  constructor(
    private readonly repository: ContactNotesRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactNotes record was not found.");
    return record;
  }
  async create(input: ContactNotesInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactNotesInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactNotesInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
  }
}
