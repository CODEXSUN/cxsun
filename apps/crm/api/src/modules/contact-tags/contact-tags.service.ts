import { AppError } from "@cxsun/framework/errors";
import type { Kysely } from "kysely";
import { ContactTagsRepository } from "./contact-tags.repository.js";
import type { ContactTagsDatabase, ContactTagsInput } from "./contact-tags.types.js";

export async function getActiveTagForDatabase(database: Kysely<ContactTagsDatabase>, id: number) {
  const tag = await new ContactTagsRepository(database).get(id);
  return tag?.status === "active" ? { id: tag.id, name: tag.name } : null;
}

export class ContactTagsService {
  constructor(
    private readonly repository: ContactTagsRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list() {
    return this.repository.list();
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactTags record was not found.");
    return record;
  }
  async create(input: ContactTagsInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactTagsInput, actor: string) {
    await this.get(id);
    await this.validate(input, id);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactTagsInput, excludeId?: number) {
    if (
      (await this.repository.list()).some(
        (item) => item.id !== excludeId && item.name.toLowerCase() === input.name.toLowerCase()
      )
    )
      throw AppError.conflict("A tag with this name already exists.");
  }
}
