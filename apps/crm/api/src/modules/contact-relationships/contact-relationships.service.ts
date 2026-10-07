import { AppError } from "@cxsun/framework/errors";
import { ContactRelationshipsRepository } from "./contact-relationships.repository.js";
import type { ContactRelationshipsInput } from "./contact-relationships.types.js";

export class ContactRelationshipsService {
  constructor(
    private readonly repository: ContactRelationshipsRepository,
    private readonly parentExists: (id: number) => Promise<boolean>,
    private readonly personCustomer: (id: number) => Promise<number | null>
  ) {}

  list(customerContactId: number) {
    return this.repository.list(customerContactId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactRelationships record was not found.");
    return record;
  }
  async create(input: ContactRelationshipsInput, actor: string) {
    await this.validate(input);

    return this.repository.create(input, actor);
  }
  async update(id: number, input: ContactRelationshipsInput, actor: string) {
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
  private async validate(input: ContactRelationshipsInput) {
    if (!(await this.parentExists(input.customerContactId)))
      throw AppError.validation("Select an active parent record.");
    if (input.personAId === input.personBId)
      throw AppError.validation("Select two different people.");
    const [customerA, customerB] = await Promise.all([
      this.personCustomer(input.personAId),
      this.personCustomer(input.personBId)
    ]);
    if (customerA !== input.customerContactId || customerB !== input.customerContactId) {
      throw AppError.validation("Both people must belong to the selected customer.");
    }
  }
}
