import type { WorkMode, ZunoConversation, ZunoThread } from "./conversations.types.js";

type Envelope<T> = { success: true; data: T } | { success: false; error: { message: string } };

async function request<T>(
  path: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: unknown
): Promise<T> {
  const response = await fetch(`/api/zuno/conversations${path}`, {
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

export const listConversations = (archived = false) =>
  request<ZunoThread[]>(archived ? "?archived=true" : "");
export const getConversation = (uuid: string) => request<ZunoConversation>(`/${uuid}`);
export const createConversation = (mode: WorkMode) => request<ZunoThread>("", "POST", { mode });
export const sendMessage = (uuid: string, content: string, mode: WorkMode) =>
  request<ZunoConversation>(`/${uuid}/messages`, "POST", { content, mode });
export const renameConversation = (uuid: string, title: string) =>
  request<ZunoThread>(`/${uuid}/title`, "PUT", { title });
export const archiveConversation = (uuid: string) =>
  request<ZunoThread>(`/${uuid}/archive`, "POST");
export const restoreConversation = (uuid: string) =>
  request<ZunoThread>(`/${uuid}/restore`, "POST");
export const recoverConversation = (uuid: string) =>
  request<ZunoConversation>(`/${uuid}/recover`, "POST");
