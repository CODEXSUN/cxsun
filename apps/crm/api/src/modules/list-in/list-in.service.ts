import { AppError } from "@cxsun/framework/errors";
import type { Kysely } from "kysely";
import { ListInRepository } from "./list-in.repository.js";
import type { ListInDatabase, ListInInput, ListInRecord } from "./list-in.types.js";

export class ListInService {
  constructor(private readonly repository: ListInRepository) {}

  list() {
    return this.repository.list();
  }

  async get(id: number): Promise<ListInRecord> {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("List In was not found.");
    return record;
  }

  async create(input: ListInInput, actor: string) {
    const value = validate(input);
    return unique(() => this.repository.create(value, actor));
  }

  async update(id: number, input: ListInInput, actor: string) {
    await this.get(id);
    return unique(() => this.repository.update(id, validate(input), actor));
  }

  async setActive(id: number, active: boolean, actor: string) {
    await this.get(id);

    if (!active && (await this.repository.usageCount(id)))
      throw AppError.conflict("List In is used by an enquiry.");
    return this.repository.setActive(id, active, actor);
  }

  async forceDelete(id: number) {
    const record = await this.get(id);

    if (await this.repository.usageCount(id))
      throw AppError.conflict("List In is used by an enquiry.");
    await this.repository.forceDelete(id);
    return record;
  }
}

export async function getActiveListInForDatabase(database: Kysely<ListInDatabase>, id: number) {
  const record = await new ListInRepository(database).get(id);
  return record?.status === "active" ? record : null;
}

function validate(input: ListInInput): ListInInput {
  const name = input.name.trim();
  if (!name) throw AppError.validation("List In name is required.");
  return { name, sortOrder: input.sortOrder };
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
      throw AppError.conflict("List In already exists.");
    throw error;
  }
}
