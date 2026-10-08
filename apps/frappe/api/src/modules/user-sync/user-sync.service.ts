import { AppError } from "@cxsun/framework/errors";
import { z } from "zod";
import type { Kysely } from "kysely";
import { FrappeConnectionRepository, requestFrappe } from "../connection/index.js";
import type { FrappeDatabase, FrappeSettings } from "../connection/index.js";
import type {
  FrappeEmployee,
  FrappeUser,
  FrappeUserIdentity,
  FrappeUserSyncContext
} from "./user-sync.types.js";

const pageSize = 100;
const maxUsers = 10_000;
const fields = ["name", "full_name", "email", "username", "enabled", "user_type", "last_active"];
const emailSchema = z.email();

export class FrappeUserSyncService {
  constructor(
    private readonly context: FrappeUserSyncContext,
    private readonly defaults: FrappeSettings,
    private readonly encryptionSecret: string
  ) {}

  async preview() {
    const settings = await this.settings();
    const users: FrappeUser[] = [];
    for (let start = 0; start <= maxUsers; start += pageSize) {
      const page = await this.fetchUsers(settings, start);
      if (start === maxUsers && page.length)
        throw AppError.conflict("Frappe has more than 10,000 users. Narrow the sync scope.");
      users.push(...page);
      if (page.length < pageSize) break;
    }
    const employees = await this.fetchEmployees(settings);
    const employeeByUser = new Map<string, FrappeEmployee>();
    for (const employee of employees) {
      const userId = employee.user_id?.trim().toLowerCase();
      if (!userId || !employee.name?.trim()) continue;
      const current = employeeByUser.get(userId);
      if (!current || (current.status !== "Active" && employee.status === "Active")) {
        employeeByUser.set(userId, employee);
      }
    }
    const local = await this.context.localUsers();
    const byEmail = new Map(local.map((user) => [user.email.toLowerCase(), user]));
    return users
      .filter((user) => validUser(user))
      .map((user) => {
        const match = byEmail.get(user.email!.toLowerCase());
        const employee =
          employeeByUser.get(user.name.toLowerCase()) ??
          employeeByUser.get(user.email!.toLowerCase());
        return {
          frappeUserId: user.name,
          name: user.full_name?.trim() || user.username?.trim() || user.name,
          email: user.email!.trim(),
          employeeCode: employee?.name.trim() || null,
          userType: user.user_type!,
          lastActiveAt: user.last_active || null,
          localUserId: match?.id ?? null,
          localStatus: match?.status ?? null
        };
      });
  }

  async import(frappeUserId: string, password?: string) {
    const user = await lookupFrappeUser(
      this.context.database,
      this.defaults,
      this.encryptionSecret,
      frappeUserId
    );
    return this.context.importUser({
      name: user.name,
      email: user.email,
      ...(password === undefined ? {} : { password })
    });
  }

  private async settings() {
    return (
      (
        await new FrappeConnectionRepository(this.context.database).credentials(
          this.encryptionSecret
        )
      )?.settings ?? this.defaults
    );
  }

  private async fetchUsers(settings: FrappeSettings, start: number) {
    const query = new URLSearchParams({
      fields: JSON.stringify(fields),
      filters: JSON.stringify([
        ["enabled", "=", 1],
        ["user_type", "=", "System User"]
      ]),
      limit_start: String(start),
      limit_page_length: String(pageSize),
      order_by: "full_name asc"
    });
    const response = await requestFrappe<{ data?: FrappeUser[] }>(
      `/api/resource/User?${query}`,
      "GET",
      settings
    );
    if (!Array.isArray(response.data))
      throw AppError.validation("Frappe returned an invalid user list.");
    return response.data;
  }

  private async fetchEmployees(settings: FrappeSettings) {
    const employees: FrappeEmployee[] = [];
    for (let start = 0; start <= maxUsers; start += pageSize) {
      const query = new URLSearchParams({
        fields: JSON.stringify(["name", "user_id", "status"]),
        limit_start: String(start),
        limit_page_length: String(pageSize),
        order_by: "name asc"
      });
      const response = await requestFrappe<{ data?: FrappeEmployee[] }>(
        `/api/resource/Employee?${query}`,
        "GET",
        settings
      );
      if (!Array.isArray(response.data))
        throw AppError.validation("Frappe returned an invalid employee list.");
      if (start === maxUsers && response.data.length)
        throw AppError.conflict("Frappe has more than 10,000 employees to preview.");
      employees.push(...response.data);
      if (response.data.length < pageSize) break;
    }
    return employees;
  }
}

export async function lookupFrappeUser(
  database: Kysely<FrappeDatabase>,
  defaults: FrappeSettings,
  encryptionSecret: string,
  frappeUserId: string
): Promise<FrappeUserIdentity> {
  const settings =
    (await new FrappeConnectionRepository(database).credentials(encryptionSecret))?.settings ??
    defaults;
  const fieldsQuery = encodeURIComponent(JSON.stringify(fields));
  const response = await requestFrappe<{ data?: FrappeUser }>(
    `/api/resource/User/${encodeURIComponent(frappeUserId)}?fields=${fieldsQuery}`,
    "GET",
    settings
  );
  const user = response.data;
  if (!user || user.name !== frappeUserId || !validUser(user))
    throw AppError.validation("This Frappe user is not an enabled System User with a valid email.");
  const employeeQuery = new URLSearchParams({
    fields: JSON.stringify(["name", "user_id", "status"]),
    filters: JSON.stringify([["user_id", "=", user.email!.trim()]]),
    limit_page_length: "100"
  });
  const employeeResponse = await requestFrappe<{ data?: FrappeEmployee[] }>(
    `/api/resource/Employee?${employeeQuery}`,
    "GET",
    settings
  );
  if (!Array.isArray(employeeResponse.data))
    throw AppError.validation("Frappe returned an invalid employee list.");
  const employee = employeeResponse.data
    .filter((record) => record.user_id?.trim().toLowerCase() === user.email!.trim().toLowerCase())
    .sort((a, b) => Number(b.status === "Active") - Number(a.status === "Active"))[0];
  return {
    frappeUserId: user.name,
    name: user.full_name?.trim() || user.username?.trim() || user.name,
    email: user.email!.trim(),
    employeeCode: employee?.name?.trim() || null
  };
}

function validUser(user: FrappeUser) {
  return (
    user.name !== "Administrator" &&
    user.name !== "Guest" &&
    Boolean(user.enabled) &&
    user.user_type === "System User" &&
    emailSchema.safeParse(user.email).success
  );
}
