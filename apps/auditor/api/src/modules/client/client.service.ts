import { AppError } from "@cxsun/framework/errors";
import { AuditorClientRepository } from "./client.repository.js";
import { auditorCredentialPortals } from "./client.types.js";
import type { AuditorClientInput, AuditorCredentialPortal } from "./client.types.js";
import { decryptAuditorPassword, encryptAuditorPassword } from "./client.secrets.js";

export class AuditorClientService {
  constructor(
    private readonly repository: AuditorClientRepository,
    private readonly secretKey: string
  ) {}

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

  async listCredentials(clientId: number) {
    await this.get(clientId);
    const rows = await this.repository.listCredentials(clientId);
    return auditorCredentialPortals.map((portal) => {
      const row = rows.find((item) => item.portal === portal);
      return {
        portal,
        username: row?.username ?? null,
        hasPassword: Boolean(row?.password_secret),
        updatedAt: row ? toIso(row.updated_at) : null
      };
    });
  }

  async saveCredential(
    clientId: number,
    portal: AuditorCredentialPortal,
    input: { username: string; password?: string | undefined },
    actor: string
  ) {
    await this.get(clientId);
    const current = await this.repository.getCredential(clientId, portal);
    const username = input.username.trim();
    if (!username) throw AppError.validation("Username or email is required.");
    if (portal === "accounts" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
      throw AppError.validation("Accounts email must be a valid email address.");
    }
    const passwordSecret = input.password
      ? encryptAuditorPassword(input.password, this.secretKey, clientId, portal)
      : current?.password_secret;
    if (!passwordSecret) {
      throw AppError.validation("Password is required for a new portal credential.");
    }
    const saved = await this.repository.upsertCredential(
      clientId,
      portal,
      username,
      passwordSecret,
      actor
    );
    if (!saved) throw AppError.notFound("Auditor client credential could not be saved.");
    return {
      portal,
      username: saved.username,
      hasPassword: true,
      updatedAt: toIso(saved.updated_at)
    };
  }

  async revealCredential(clientId: number, portal: AuditorCredentialPortal) {
    await this.get(clientId);
    const row = await this.repository.getCredential(clientId, portal);
    if (!row) throw AppError.notFound("Portal credential was not found.");
    return {
      password: decryptAuditorPassword(row.password_secret, this.secretKey, clientId, portal)
    };
  }
}

function toIso(value: unknown) {
  if (value instanceof Date) return value.toISOString();
  const text = String(value).replace(" ", "T");
  return new Date(text.endsWith("Z") ? text : `${text}Z`).toISOString();
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
