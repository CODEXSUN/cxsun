import { AppError } from "@cxsun/framework/errors";
import { ContactLifecycleRepository } from "./contact-lifecycle.repository.js";
import type { ContactLifecycleInput, ContactLifecycleRecord } from "./contact-lifecycle.types.js";

export class ContactLifecycleService {
  constructor(
    private readonly repository: ContactLifecycleRepository,
    private readonly parentExists: (id: number) => Promise<boolean>
  ) {}

  list(personId: number) {
    return this.repository.list(personId);
  }
  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("ContactLifecycle record was not found.");
    return record;
  }
  async create(input: ContactLifecycleInput, actor: string) {
    await this.validate(input);
    if (!["Prospect", "Active", "Inactive", "Former"].includes(input.newStatus)) {
      throw AppError.validation("Select a supported lifecycle status.");
    }
    const latest = (await this.repository.list(input.personId))[0];
    const previousStatus = latest?.newStatus ?? null;
    const effectiveAt = input.effectiveAt ?? new Date().toISOString().slice(0, 10);
    if (latest?.effectiveAt && effectiveAt < latest.effectiveAt) {
      throw AppError.validation("Effective date cannot be before the latest lifecycle event.");
    }
    if (previousStatus?.toLowerCase() === input.newStatus.toLowerCase()) {
      throw AppError.conflict("This is already the current lifecycle status.");
    }
    return this.repository.create(
      {
        ...input,
        previousStatus,
      effectiveAt
      },
      actor
    );
  }
  async update(
    id: number,
    _input: ContactLifecycleInput,
    _actor: string
  ): Promise<ContactLifecycleRecord> {
    await this.get(id);
    throw AppError.conflict("Lifecycle history cannot be edited. Add a new event instead.");
  }
  async setActive(id: number, _active: boolean, _actor: string): Promise<ContactLifecycleRecord> {
    await this.get(id);
    throw AppError.conflict("Lifecycle history cannot be changed. Add a new event instead.");
  }
  private async validate(input: ContactLifecycleInput) {
    if (!(await this.parentExists(input.personId)))
      throw AppError.validation("Select an active parent record.");
  }
}
