import { AppError } from "@cxsun/framework/errors";
import { ContactRolesRepository } from "./contact-roles.repository.js";
import type { ContactRolesInput } from "./contact-roles.types.js";

export class ContactRolesService {
  constructor(
    private readonly repository: ContactRolesRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactRoles record was not found.");
    return record;
  }
  async create(input: ContactRolesInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactRolesInput, actor: string) {
    const current = await this.get(id);
    if (current.personId !== input.personId) throw AppError.validation("Parent cannot be changed.");
    await this.validate(input, id);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    const record = await this.get(id);
    if (active) await this.validate(record, id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactRolesInput, excludeId?: number) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
    if (
      input.isPrimaryRole &&
      (await this.repository.list(input.personId)).some(
        (item) => item.id !== excludeId && item.status === "active" && item.isPrimaryRole
      )
    )
      throw AppError.conflict("This person already has a primary role.");
  }
}
