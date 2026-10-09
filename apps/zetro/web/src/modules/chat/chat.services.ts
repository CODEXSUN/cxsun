import type { ZetroConversation, ZetroConversationDetail } from "./chat.types";
import type { ZetroTextAttachment } from "./chat.attachment";

type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };

async function zetroRequest<T>(
  path: string,
  method: "GET" | "POST" | "DELETE" = "GET",
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
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(database ? { "x-tenant-db": database } : {}),
      ...(tenantId ? { "x-tenant-id": tenantId } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const result = (await response.json()) as Envelope<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.success ? "Zetro request failed." : result.error.message);
  }
  return result.data;
}

export const listZetroConversations = () =>
  zetroRequest<ZetroConversation[]>("/zetro/conversations");
export const getZetroConversation = (id: number) =>
  zetroRequest<ZetroConversationDetail>(`/zetro/conversations/${id}`);
export const sendZetroMessage = (
  conversationId: number | null,
  prompt: string,
  attachment?: ZetroTextAttachment
) =>
  zetroRequest<ZetroConversationDetail>("/zetro/messages", "POST", {
    conversationId,
    prompt,
    ...(attachment ? { attachment } : {})
  });
export const deleteZetroConversation = (id: number) =>
  zetroRequest<{ deleted: true }>(`/zetro/conversations/${id}`, "DELETE");
