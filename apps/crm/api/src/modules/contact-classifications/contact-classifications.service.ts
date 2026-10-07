import { AppError } from "@cxsun/framework/errors";
import { ContactClassificationsRepository } from "./contact-classifications.repository.js";
import type { ContactClassificationsInput } from "./contact-classifications.types.js";

export class ContactClassificationsService {
  constructor(
    private readonly repository: ContactClassificationsRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactClassifications record was not found.");
    return record;
  }
  async create(input: ContactClassificationsInput, actor: string) {
    await this.validate(input);
    if ((await this.repository.list(input.personId)).length)
      throw AppError.conflict("A contact-classifications record already exists for this parent.");
    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactClassificationsInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactClassificationsInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
  }
}
