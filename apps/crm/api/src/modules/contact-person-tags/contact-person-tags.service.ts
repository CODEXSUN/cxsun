import { AppError } from "@cxsun/framework/errors";
import { ContactPersonTagsRepository } from "./contact-person-tags.repository.js";
import type { ContactPersonTagsInput } from "./contact-person-tags.types.js";

export class ContactPersonTagsService {
  constructor(
    private readonly repository: ContactPersonTagsRepository,
    private readonly parentExists: (id: number) => Promise<boolean>,
    private readonly tagExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactPersonTags record was not found.");
    return record;
  }
  async create(input: ContactPersonTagsInput, actor: string) {
    await this.validate(input);
    const existing = (await this.repository.list(input.personId)).find(
      (item) => item.tagId === input.tagId
    );
    if (existing?.status === "active") throw AppError.conflict("This tag is already assigned.");
    if (existing) return this.repository.setActive(existing.id, true, actor);
    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactPersonTagsInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    if (
      (await this.repository.list(input.personId)).some(
        (item) => item.id !== id && item.tagId === input.tagId
      )
    )
      throw AppError.conflict("This tag is already assigned.");
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactPersonTagsInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
    if (!(await this.tagExists(input.tagId))) throw AppError.validation("Select an active tag.");
  }
}
