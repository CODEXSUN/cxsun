import { randomBytes } from "node:crypto";
import { AppError } from "@cxsun/framework/errors";
import { hashPassword } from "../../auth/password-hash.js";
import { recordTenantAccessAudit } from "../../database/tenant-access-audit.js";
import { TenantUserRepository } from "./tenant-user.repository.js";
import { selectUserRole } from "../tenant-user-role/index.js";
import type {
  TenantUser,
  TenantUserContext,
  TenantUserListFilters,
  TenantUserSavePayload,
  TenantUserStatus
} from "./tenant-user.types.js";

export class TenantUserService {
  private readonly repository: TenantUserRepository;
  constructor(private readonly context: TenantUserContext) {
    this.repository = new TenantUserRepository(context.database);
  }
  async list(filters: TenantUserListFilters = {}) {
    await this.context.authorize("platform.application.user.view");
    return this.repository.list(filters);
  }
  async get(id: string) {
    await this.context.authorize("platform.application.user.view");
    return this.repository.find(id);
  }
  async create(input: TenantUserSavePayload) {
    await this.context.authorize("platform.application.user.create");
    if (input.roleId !== undefined)
      await this.context.authorize("platform.application.user-role.assign");
    const value = normalize(input, true);
    const record = await this.save(() =>
      this.context.database.transaction().execute(async (database) => {
        const repository = new TenantUserRepository(database);
        const created = await repository.create(
          value,
          randomBytes(4).toString("hex"),
          hashPassword(value.password!)
        );
        if (input.roleId !== undefined) await selectUserRole(database, created.id, input.roleId);
        return (await repository.find(created.id))!;
      })
    );
    await this.audit("created", record);
    if (input.roleId !== undefined) await this.audit("role-assigned", record);
    return record;
  }
  async importFromFrappe(input: { name: string; email: string; password?: string }) {
    await this.context.authorize("platform.application.user.view");
    await this.context.authorize("platform.application.user.create");
    await this.context.authorize("platform.application.user-role.assign");
    if (
      input.password !== undefined &&
      (input.password.length < 8 ||
        input.password.length > 128 ||
        input.password !== input.password.trim())
    )
      throw AppError.validation(
        "Custom password must be 8 to 128 characters without outer spaces."
      );
    const email = input.email.trim().toLowerCase();
    const existing = (await this.repository.list({ search: email })).find(
      (user) => user.email.toLowerCase() === email
    );
    if (existing) return { status: "already-exists" as const, userId: existing.id, password: null };
    const role = await this.context.database
      .selectFrom("app_roles")
      .select("id")
      .where("key", "=", "user")
      .where("status", "=", "active")
      .executeTakeFirst();
    if (!role) throw AppError.conflict("The standard user role is unavailable.");
    const password = input.password ?? `Cx!${randomBytes(18).toString("base64url")}`;
    const user = await this.create({
      email,
      name: input.name,
      password,
      roleId: role.id,
      status: "active"
    });
    return {
      status: "created" as const,
      userId: user.id,
      password: input.password === undefined ? password : null
    };
  }
  async update(id: string, input: TenantUserSavePayload) {
    await this.context.authorize("platform.application.user.update");
    const current = await this.mutable(id);
    const selectedRoleChanged = input.roleId !== undefined && input.roleId !== current.roles[0]?.id;
    if (selectedRoleChanged) await this.context.authorize("platform.application.user-role.update");
    const value = normalize(input, false);
    let roleChanged = false;
    const record = (await this.save(() =>
      this.context.database.transaction().execute(async (database) => {
        const repository = new TenantUserRepository(database);
        await repository.update(
          current.id,
          value,
          value.password ? hashPassword(value.password) : undefined
        );
        if (selectedRoleChanged && input.roleId !== undefined)
          roleChanged = await selectUserRole(database, current.id, input.roleId);
        return repository.find(current.id);
      })
    ))!;
    await this.audit("updated", record);
    if (roleChanged) await this.audit("role-updated", record);
    return record;
  }
  async setStatus(id: string, status: TenantUserStatus) {
    await this.context.authorize("platform.application.user.suspend");
    const current = await this.mutable(id);
    const record = (await this.repository.setStatus(current.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", record);
    return record;
  }
  async forceDelete(id: string) {
    await this.context.authorize("platform.application.user.delete");
    const current = await this.mutable(id);
    const count = await this.repository.dependentCount(current.id);
    if (count)
      throw AppError.conflict(
        `User cannot be force deleted because ${count} role assignments reference it.`,
        { count }
      );
    const record = await this.delete(current.id);
    await this.audit("force-deleted", record);
    return record;
  }
  private async mutable(id: string): Promise<TenantUser> {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("User was not found.");
    if (record.isProtected) throw AppError.forbidden("Protected users cannot be modified.");
    return record;
  }
  private async audit(action: string, record: TenantUser) {
    await recordTenantAccessAudit({
      action,
      actorEmail: this.context.actorEmail,
      moduleKey: "platform.tenant-user",
      recordId: record.id,
      recordLabel: record.name,
      recordUuid: record.uuid,
      tenantId: this.context.tenantId
    });
  }
  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("User email already exists.");
      throw error;
    }
  }
  private async delete(id: number) {
    try {
      return (await this.repository.forceDelete(id))!;
    } catch (error) {
      if (isReferenced(error)) {
        throw AppError.conflict(
          "User cannot be force deleted because business or audit records reference it."
        );
      }
      throw error;
    }
  }
}
function normalize(input: TenantUserSavePayload, creating: boolean): TenantUserSavePayload {
  const password = input.password?.trim();
  if (creating && (!password || password.length < 8))
    throw AppError.validation("Password must contain at least 8 characters.");
  return {
    email: input.email.trim().toLowerCase(),
    name: input.name.trim(),
    ...(password ? { password } : {}),
    status: input.status
  };
}
function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}

function isReferenced(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    (("code" in error && (error as { code?: unknown }).code === "ER_ROW_IS_REFERENCED_2") ||
      ("errno" in error && (error as { errno?: unknown }).errno === 1451))
  );
}
