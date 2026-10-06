import { AppError } from "@cxsun/framework/errors";
import type { Kysely } from "kysely";
import { StatusRepository } from "./status.repository.js";
import type { StatusDatabase, StatusInput, StatusRecord } from "./status.types.js";

export class StatusService {
  constructor(private readonly repository: StatusRepository) {}

  list() {
    return this.repository.list();
  }

  async get(id: number): Promise<StatusRecord> {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("Status was not found.");
    return record;
  }

  async create(input: StatusInput, actor: string) {
    const value = validate(input);
    return unique(() => this.repository.create(value, actor, codeFor(value.name)));
  }

  async update(id: number, input: StatusInput, actor: string) {
    await this.get(id);
    return unique(() => this.repository.update(id, validate(input), actor));
  }

  async setActive(id: number, active: boolean, actor: string) {
    const record = await this.get(id);
    if (!active && record.code === "new")
      throw AppError.conflict("The default Status must stay active.");
    if (!active && (await this.repository.usageCount(id)))
      throw AppError.conflict("Status is used by an enquiry.");
    return this.repository.setActive(id, active, actor);
  }

  async forceDelete(id: number) {
    const record = await this.get(id);
    if (record.code === "new") throw AppError.conflict("The default Status cannot be deleted.");
    if (await this.repository.usageCount(id))
      throw AppError.conflict("Status is used by an enquiry.");
    await this.repository.forceDelete(id);
    return record;
  }
}

export async function getActiveStatusForDatabase(database: Kysely<StatusDatabase>, id: number) {
  const record = await new StatusRepository(database).get(id);
  return record?.status === "active" ? record : null;
}

function validate(input: StatusInput): StatusInput {
  const name = input.name.trim();
  if (!name) throw AppError.validation("Status name is required.");
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
      throw AppError.conflict("Status already exists.");
    throw error;
  }
}
