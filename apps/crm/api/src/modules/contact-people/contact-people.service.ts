import { AppError } from "@cxsun/framework/errors";
import type { Kysely } from "kysely";
import { ContactPeopleRepository } from "./contact-people.repository.js";
import type { ContactPeopleDatabase, ContactPeopleInput } from "./contact-people.types.js";

export async function getActivePersonForDatabase(
  database: Kysely<ContactPeopleDatabase>,
  id: number
) {
  const person = await new ContactPeopleRepository(database).get(id);
  return person?.status === "active"
    ? { id: person.id, customerContactId: person.customerContactId }
    : null;
}

export class ContactPeopleService {
  constructor(
    private readonly repository: ContactPeopleRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(customerContactId: number) {
    return this.repository.list(customerContactId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactPeople record was not found.");
    return record;
  }
  async create(input: ContactPeopleInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactPeopleInput, actor: string) {
    const current = await this.get(id);
    if (current.customerContactId !== input.customerContactId)
      throw AppError.validation("Parent cannot be changed.");
    await this.validate(input);
    return this.repository.update(id, input, actor);
  }
  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);
    return this.repository.setActive(id, active, actor);
  }
  private async validate(input: ContactPeopleInput) {
    if (!(await this.parentExists(input.customerContactId)))
      throw AppError.validation("Select an active parent record.");
  }
}
