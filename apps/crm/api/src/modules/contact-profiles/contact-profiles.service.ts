import { AppError } from "@cxsun/framework/errors";
import { ContactProfilesRepository } from "./contact-profiles.repository.js";
import type { ContactProfilesInput } from "./contact-profiles.types.js";

export class ContactProfilesService {
  constructor(
    private readonly repository: ContactProfilesRepository,
    private readonly parentExists: (id: number) => Promise<boolean>,
    private readonly industryExists: (id: number) => Promise<boolean>
  ) {}

  list(coreContactId: number) {
    return this.repository.list(coreContactId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactProfiles record was not found.");
    return record;
  }
  async create(input: ContactProfilesInput, actor: string) {
    await this.validate(input);
    if ((await this.repository.list(input.coreContactId)).length)
      throw AppError.conflict("A contact-profiles record already exists for this parent.");
    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactProfilesInput, actor: string) {
    const current = await this.get(id);
    if (current.coreContactId !== input.coreContactId)
      throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactProfilesInput) {
    if (!(await this.parentExists(input.coreContactId)))
      throw AppError.validation("Select an active parent record.");
    if (input.industryId !== null && !(await this.industryExists(input.industryId))) {
      throw AppError.validation("Select an active industry.");
    }
  }
}
