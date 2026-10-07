import { AppError } from "@cxsun/framework/errors";
import { ContactPreferencesRepository } from "./contact-preferences.repository.js";
import type { ContactPreferencesInput } from "./contact-preferences.types.js";

export class ContactPreferencesService {
  constructor(
    private readonly repository: ContactPreferencesRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactPreferences record was not found.");
    return record;
  }
  async create(input: ContactPreferencesInput, actor: string) {
    await this.validate(input);
    if ((await this.repository.list(input.personId)).length)
      throw AppError.conflict("A contact-preferences record already exists for this parent.");
    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactPreferencesInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactPreferencesInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
  }
}
