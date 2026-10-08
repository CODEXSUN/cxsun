import type { FrappeConnection, FrappeConnectionInput } from "./connection.types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function request<T>(
  method: "GET" | "PUT" | "POST",
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

export const getFrappeConnection = () => request<FrappeConnection>("GET", "/frappe/connection");
export const saveFrappeConnection = (input: FrappeConnectionInput) =>
  request<FrappeConnection>("PUT", "/frappe/connection", input);
export const verifyFrappeConnection = (input: FrappeConnectionInput) =>
  request<{ connected: boolean; user: string; saved: boolean }>(
    "POST",
    "/frappe/connection/verify",
    input
  );
