import type {
  ZetroCodexStatus,
  ZetroLocalCodexStatus,
  ZetroProviderSave,
  ZetroProviderSettings
} from "./provider.types";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function providerRequest<T>(
  path:
    | "/zetro/provider"
    | "/zetro/provider/models"
    | "/zetro/provider/codex/status"
    | "/zetro/provider/codex/device-login"
    | "/zetro/provider/codex/disconnect"
    | "/zetro/provider/codex/local-status"
    | "/zetro/provider/codex/bind-local",
  body?: ZetroProviderSave,
  post = false
): Promise<T> {
  const baseUrl = (window as Window & { __CXSUN_RUNTIME_CONFIG__?: Record<string, string> })
    .__CXSUN_RUNTIME_CONFIG__?.VITE_PLATFORM_API_URL;
  if (!baseUrl) throw new Error("Missing Platform API URL.");
  const database = sessionStorage.getItem("cxsun_tenant_db_name");
  const tenantId = sessionStorage.getItem("cxsun_tenant_id");
  const response = await fetch(`${baseUrl}${path}`, {
    method: body ? "PUT" : post ? "POST" : "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(database ? { "x-tenant-db": database } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = (await response.json()) as Envelope<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.success ? "Zetro provider request failed." : result.error.message);
  }
  return result.data;
}

export const getZetroProviderSettings = () =>
  providerRequest<ZetroProviderSettings>("/zetro/provider");
export const saveZetroProviderSettings = (input: ZetroProviderSave) =>
  providerRequest<ZetroProviderSettings>("/zetro/provider", input);
export const listZetroProviderModels = () => providerRequest<string[]>("/zetro/provider/models");
export const getZetroCodexStatus = () =>
  providerRequest<ZetroCodexStatus>("/zetro/provider/codex/status");
export const startZetroCodexLogin = () =>
  providerRequest<ZetroCodexStatus>("/zetro/provider/codex/device-login", undefined, true);
export const disconnectZetroCodex = () =>
  providerRequest<ZetroCodexStatus>("/zetro/provider/codex/disconnect", undefined, true);
export const getZetroLocalCodexStatus = () =>
  providerRequest<ZetroLocalCodexStatus>("/zetro/provider/codex/local-status");
export const bindZetroLocalCodex = () =>
  providerRequest<ZetroCodexStatus>("/zetro/provider/codex/bind-local", undefined, true);
