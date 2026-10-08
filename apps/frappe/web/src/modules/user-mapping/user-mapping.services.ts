import { saveUserMappingSchema } from "./user-mapping.schema";
import type { FrappeMappingUser, UserMapping, UserMappingOverview } from "./user-mapping.types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function request<T>(
  method: "GET" | "PUT" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const baseUrl = (window as Window & { __CXSUN_RUNTIME_CONFIG__?: Record<string, string> })
    .__CXSUN_RUNTIME_CONFIG__?.VITE_PLATFORM_API_URL;
  if (!baseUrl) throw new Error("Missing Platform API URL.");
  const database = sessionStorage.getItem("cxsun_tenant_db_name");
  const tenantId = sessionStorage.getItem("cxsun_tenant_id");
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(database ? { "x-tenant-db": database } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {})
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const result = (await response.json()) as Envelope<T>;
  if (!response.ok || !result.success)
    throw new Error(result.success ? "Frappe request failed." : result.error.message);
  return result.data;
}

export const getUserMappings = () => request<UserMappingOverview>("GET", "/frappe/user-mappings");
export const getFrappeMappingUsers = () =>
  request<FrappeMappingUser[]>("GET", "/frappe/users/preview");
export const saveUserMapping = (input: { localUserId: number; frappeUserId: string }) =>
  request<UserMapping>("PUT", "/frappe/user-mappings", saveUserMappingSchema.parse(input));
export const removeUserMapping = (localUserId: number) =>
  request<{ localUserId: number }>("DELETE", `/frappe/user-mappings/${localUserId}`);
