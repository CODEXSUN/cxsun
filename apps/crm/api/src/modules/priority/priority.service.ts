import { AppError } from "@cxsun/framework/errors";
import type { Kysely } from "kysely";
import { PriorityRepository } from "./priority.repository.js";
import type { PriorityDatabase, PriorityInput, PriorityRecord } from "./priority.types.js";

export class PriorityService {
  constructor(private readonly repository: PriorityRepository) {}

  list() {
    return this.repository.list();
  }

  async get(id: number): Promise<PriorityRecord> {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("Priority was not found.");
    return record;
  }

  async create(input: PriorityInput, actor: string) {
    const value = validate(input);
    return unique(() => this.repository.create(value, actor, codeFor(value.name)));
  }

  async update(id: number, input: PriorityInput, actor: string) {
    await this.get(id);
    return unique(() => this.repository.update(id, validate(input), actor));
  }

  async setActive(id: number, active: boolean, actor: string) {
    const record = await this.get(id);
    if (!active && record.code === "normal")
      throw AppError.conflict("The default Priority must stay active.");
    if (!active && (await this.repository.usageCount(id)))
      throw AppError.conflict("Priority is used by an enquiry.");
    return this.repository.setActive(id, active, actor);
  }

  async forceDelete(id: number) {
    const record = await this.get(id);
    if (record.code === "normal")
      throw AppError.conflict("The default Priority cannot be deleted.");
    if (await this.repository.usageCount(id))
      throw AppError.conflict("Priority is used by an enquiry.");
    await this.repository.forceDelete(id);
    return record;
  }
}

export async function getActivePriorityForDatabase(database: Kysely<PriorityDatabase>, id: number) {
  const record = await new PriorityRepository(database).get(id);
  return record?.status === "active" ? record : null;
}

function validate(input: PriorityInput): PriorityInput {
  const name = input.name.trim();
  if (!name) throw AppError.validation("Priority name is required.");
  return { name, sortOrder: input.sortOrder };
}
function codeFor(name: string) {
  return name.trim().toLowerCase().replace(/\s+/gu, "-");
}
async function unique<T>(save: () => Promise<T>): Promise<T> {
  try {
    return await save();
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ER_DUP_ENTRY"
    )
      throw AppError.conflict("Priority already exists.");
    throw error;
  }
}
