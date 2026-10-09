export type ZetroTenantOption = {
  uuid: string;
  tenantName: string;
  tenantCode: string;
  enabledModuleKeys: string[];
};

export type ZetroQueryPattern = {
  uuid: string;
  serial_no: number;
  intent_key: string | null;
  question_pattern: string;
  query_pattern: string;
  limitation: string;
  extra: string;
  status: "active" | "draft" | "retired";
};

export type ZetroInteractionLog = {
  id: number;
  uuid: string;
  pattern_uuid: string | null;
  actor_email: string;
  prompt_text: string;
  response_text: string | null;
  intent: string;
  skill_decision: string | null;
  outcome: string;
  created_at: string;
};

export type ZetroPatternDraft = {
  serialNo: number;
  questionPattern: string;
  queryPattern: string;
  limitation: string;
  extra: string;
};

export const zetroCapabilities = [
  "billing.customer-outstanding.read",
  "billing.daily-summary.read",
  "billing.monthly-summary.read",
  "billing.aged-sales.read"
] as const;

export const zetroCapabilityLabels: Record<(typeof zetroCapabilities)[number], string> = {
  "billing.customer-outstanding.read": "Customer balance",
  "billing.daily-summary.read": "Today's report",
  "billing.monthly-summary.read": "This month's totals",
  "billing.aged-sales.read": "Long outstanding sales"
};

export type ZetroGrantChange = {
  roleKey: string;
  capabilityKey: (typeof zetroCapabilities)[number];
  status: "active" | "revoked";
  reason: string;
};

export type ZetroGrant = {
  role_key: string;
  capability_key: string;
  status: "active" | "revoked";
  approved_by: string;
  reason: string;
};

export type ZetroRole = { role_key: string; label: string };

type Envelope<T> = { success: true; data: T } | { success: false; error: { message: string } };

async function adminRequest<T>(
  path: string,
  body?: ZetroPatternDraft | ZetroGrantChange,
  method?: "POST" | "PUT"
): Promise<T> {
  const baseUrl = (window as Window & { __CXSUN_RUNTIME_CONFIG__?: Record<string, string> })
    .__CXSUN_RUNTIME_CONFIG__?.VITE_PLATFORM_API_URL;
  if (!baseUrl) throw new Error("Missing Platform API URL.");
  const response = await fetch(`${baseUrl}${path}`, {
    method: method ?? (body ? "POST" : "GET"),
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = (await response.json()) as Envelope<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.success ? "Zetro review request failed." : result.error.message);
  }
  return result.data;
}

export const listZetroTenants = () => adminRequest<ZetroTenantOption[]>("/admin/tenants");
export const listZetroPatterns = (tenantId: string) =>
  adminRequest<ZetroQueryPattern[]>(`/zetro/admin/tenants/${tenantId}/patterns`);
export const listZetroInteractions = (tenantId: string) =>
  adminRequest<ZetroInteractionLog[]>(`/zetro/admin/tenants/${tenantId}/interactions`);
export const createZetroPatternDraft = (tenantId: string, draft: ZetroPatternDraft) =>
  adminRequest<{ uuid: string; status: "draft" }>(
    `/zetro/admin/tenants/${tenantId}/patterns`,
    draft
  );
export const listZetroGrants = (tenantId: string) =>
  adminRequest<ZetroGrant[]>(`/zetro/admin/tenants/${tenantId}/grants`);
export const listZetroRoles = (tenantId: string) =>
  adminRequest<ZetroRole[]>(`/zetro/admin/tenants/${tenantId}/roles`);
export const saveZetroGrant = (tenantId: string, change: ZetroGrantChange) =>
  adminRequest<{ saved: true }>(`/zetro/admin/tenants/${tenantId}/grants`, change, "PUT");
