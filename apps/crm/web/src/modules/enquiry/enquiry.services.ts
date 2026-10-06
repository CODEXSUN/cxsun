import type { EnquiryLookup, EnquiryRecord, EnquirySavePayload } from "./enquiry.types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
const baseUrl = (window as Window & { __CXSUN_RUNTIME_CONFIG__?: Record<string, string> })
  .__CXSUN_RUNTIME_CONFIG__?.VITE_PLATFORM_API_URL;
if (!baseUrl) throw new Error("Missing VITE_PLATFORM_API_URL for CRM.");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const database = sessionStorage.getItem("cxsun_tenant_db_name");
  const tenantId = sessionStorage.getItem("cxsun_tenant_id");
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(database ? { "x-tenant-db": database } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {}),
      ...options.headers
    }
  });
  const result = (await response.json()) as Envelope<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.success ? "CRM request failed." : result.error.message);
  }
  return result.data;
}

export const listEnquiries = () => request<EnquiryRecord[]>("/crm/enquiries");
export const createEnquiry = (payload: EnquirySavePayload) =>
  request<EnquiryRecord>("/crm/enquiries", { method: "POST", body: JSON.stringify(payload) });
export const updateEnquiry = (id: number, payload: EnquirySavePayload) =>
  request<EnquiryRecord>(`/crm/enquiries/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const listCoreContacts = () => request<EnquiryLookup[]>("/core/master/contacts");
export const listTenantUsers = () => request<EnquiryLookup[]>("/tenant/access/users");
