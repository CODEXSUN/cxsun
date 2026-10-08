import { createHash } from "node:crypto";
import { AppError } from "@cxsun/framework/errors";
import type { Selectable } from "kysely";
import { FrappeConnectionRepository } from "../connection/index.js";
import type { FrappeSettings } from "../connection/index.js";
import { lookupFrappeUser } from "../user-sync/index.js";
import { FrappeUserMappingRepository } from "./user-mapping.repository.js";
import type { FrappeUserMappingContext, FrappeUserMappingRow } from "./user-mapping.types.js";

export class FrappeUserMappingService {
  private readonly repository: FrappeUserMappingRepository;

  constructor(
    private readonly context: FrappeUserMappingContext,
    private readonly defaults: FrappeSettings,
    private readonly encryptionSecret: string
  ) {
    this.repository = new FrappeUserMappingRepository(context.database);
  }

  async list() {
    const [localUsers, rows, connectionHash] = await Promise.all([
      this.context.localUsers(),
      this.repository.list(),
      this.connectionHash()
    ]);
    return {
      localUsers,
      links: rows.map((row) => toRecord(row, connectionHash))
    };
  }

  async save(input: { localUserId: number; frappeUserId: string }) {
    const user = (await this.context.localUsers()).find((item) => item.id === input.localUserId);
    if (!user) throw AppError.notFound("Local application user was not found.");
    const connectionHash = await this.connectionHash();
    const remote = await lookupFrappeUser(
      this.context.database,
      this.defaults,
      this.encryptionSecret,
      input.frappeUserId
    );
    if (connectionHash !== (await this.connectionHash()))
      throw AppError.conflict("The Frappe connection changed while checking this user. Try again.");
    let saved: Awaited<ReturnType<FrappeUserMappingRepository["save"]>>;
    try {
      saved = await this.repository.save({
        local_user_id: user.id,
        frappe_user_id: remote.frappeUserId,
        frappe_email: remote.email,
        employee_code: remote.employeeCode,
        connection_hash: connectionHash
      });
    } catch (error) {
      if (isDuplicate(error))
        throw AppError.conflict("That Frappe user is already linked to another local user.");
      throw error;
    }
    await this.context.audit(saved.created ? "linked" : "updated", user, remote.frappeUserId);
    return toRecord(saved.row, connectionHash);
  }

  async remove(localUserId: number) {
    const user = (await this.context.localUsers()).find((item) => item.id === localUserId);
    if (!user) throw AppError.notFound("Local application user was not found.");
    const removed = await this.repository.remove(localUserId);
    if (!removed) throw AppError.notFound("This application user has no Frappe mapping.");
    await this.context.audit("unlinked", user, removed.frappe_user_id);
    return { localUserId };
  }

  private async connectionHash() {
    const stored = await new FrappeConnectionRepository(this.context.database).connection();
    const baseUrl = stored?.base_url || this.defaults.baseUrl;
    return createHash("sha256")
      .update(baseUrl ? new URL(baseUrl).origin.toLowerCase() : "unconfigured")
      .digest("hex");
  }
}

function toRecord(row: Selectable<FrappeUserMappingRow>, connectionHash: string) {
  return {
    localUserId: Number(row.local_user_id),
    frappeUserId: row.frappe_user_id,
    frappeEmail: row.frappe_email,
    employeeCode: row.employee_code,
    connectionCurrent: row.connection_hash === connectionHash,
    verifiedAt: new Date(row.verified_at).toISOString()
  };
}

function isDuplicate(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
