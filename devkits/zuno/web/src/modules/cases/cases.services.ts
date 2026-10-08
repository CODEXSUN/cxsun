import type {
  TenantTarget,
  ZunoCase,
  ZunoCaseDetail,
  ZunoCaseInput,
  TextCorrectionPlan
} from "./cases.types.js";

type Envelope<T> = { success: true; data: T } | { success: false; error: { message: string } };

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(`/api/zuno${path}`, {
    method,
    credentials: "include",
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || !envelope.success)
    throw new Error(envelope.success ? "Zuno request failed." : envelope.error.message);
  return envelope.data;
}

export const listCases = () => request<ZunoCase[]>("/cases");
export const listTenantTargets = () => request<TenantTarget[]>("/cases/targets");
export const getCase = (uuid: string) => request<ZunoCaseDetail>(`/cases/${uuid}`);
export const createCase = (input: ZunoCaseInput) => request<ZunoCase>("/cases", "POST", input);
export const proposeCase = (uuid: string, proposal: string) =>
  request<ZunoCase>(`/cases/${uuid}/proposal`, "PUT", { proposal });
export const approveCase = (uuid: string) => request<ZunoCase>(`/cases/${uuid}/approve`, "POST");
export const planTextCorrection = (uuid: string, plan: TextCorrectionPlan) =>
  request<{ record: ZunoCase; preview: { currentValue: string | null; sql: string } }>(
    `/cases/${uuid}/sql-plan`,
    "PUT",
    plan
  );
export const executeTextCorrection = (uuid: string) =>
  request<ZunoCase>(`/cases/${uuid}/execute-sql`, "POST");
export const reconcileTextCorrection = (uuid: string) =>
  request<ZunoCase>(`/cases/${uuid}/reconcile-sql`, "POST");
export const completeCase = (uuid: string, verification: string) =>
  request<ZunoCase>(`/cases/${uuid}/complete`, "POST", { verification });
export const cancelCase = (uuid: string, reason: string) =>
  request<ZunoCase>(`/cases/${uuid}/cancel`, "POST", { reason });
