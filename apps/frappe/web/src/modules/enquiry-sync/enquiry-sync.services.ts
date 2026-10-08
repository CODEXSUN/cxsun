import type { FrappeConnectionState, LocalEnquiryPage, RemoteEnquiry } from "./enquiry-sync.types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function request<T>(path: string, body?: unknown): Promise<T> {
  const baseUrl = (window as Window & { __CXSUN_RUNTIME_CONFIG__?: Record<string, string> })
    .__CXSUN_RUNTIME_CONFIG__?.VITE_PLATFORM_API_URL;
  if (!baseUrl) throw new Error("Missing Platform API URL.");
  const database = sessionStorage.getItem("cxsun_tenant_db_name");
  const tenantId = sessionStorage.getItem("cxsun_tenant_id");
  const response = await fetch(`${baseUrl}${path}`, {
    method: body === undefined ? "GET" : "POST",
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

export const getConnectionState = () => request<FrappeConnectionState>("/frappe/connection");
export const getRemoteEnquiries = () => request<RemoteEnquiry[]>("/frappe/enquiries/remote");
export const getLocalEnquiries = (page: number, pageSize: number, search: string) =>
  request<LocalEnquiryPage>(
    `/frappe/overview?${new URLSearchParams({ page: String(page), pageSize: String(pageSize), search })}`
  );
export const pullEnquiry = (remoteName: string) =>
  request<{ remoteName: string; enquiryId: number; status: "created" | "updated" }>(
    "/frappe/enquiries/pull",
    { remoteName }
  );
export const postEnquiry = (id: number) =>
  request<{ enquiryId: number; remoteName: string; syncedAt: string }>(
    `/frappe/enquiries/${id}/sync`,
    {}
  );
