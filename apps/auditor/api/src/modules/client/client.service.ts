import { AppError } from "@cxsun/framework/errors";
import { AuditorClientRepository } from "./client.repository.js";
import type { AuditorClientInput } from "./client.types.js";

export class AuditorClientService {
  constructor(private readonly repository: AuditorClientRepository) {}

  list(search = "") {
    return this.repository.list(search);
  }

  async get(id: number) {
    const record = await this.repository.get(id);
    if (!record) throw AppError.notFound("Auditor client was not found.");
    return record;
  }

  async create(input: AuditorClientInput, actor: string) {
    const record = await this.repository.create(normalize(input), actor);
    if (!record) throw AppError.notFound("Auditor client could not be created.");
    return record;
  }

  async update(id: number, input: AuditorClientInput) {
    await this.get(id);
    const record = await this.repository.update(id, normalize(input));
    if (!record) throw AppError.notFound("Auditor client was not found.");
    return record;
  }
}

function normalize(input: AuditorClientInput): AuditorClientInput {
  return {
    name: input.name.trim(),
    companyName: input.companyName?.trim() || null,
    ownerName: input.ownerName?.trim() || null,
    mobile: input.mobile?.trim() || null,
    email: input.email?.trim().toLowerCase() || null,
    gstin: input.gstin?.trim().toUpperCase() || null,
    status: input.status
  };
}
