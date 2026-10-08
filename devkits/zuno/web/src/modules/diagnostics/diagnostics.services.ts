import type { ZunoDiagnosis, ZunoStatus } from "./diagnostics.types.js";

type Envelope<T> = { success: true; data: T } | { success: false; error: { message: string } };

async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api/zuno${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    ...(body === undefined
      ? {}
      : {
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        })
  });
  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || !envelope.success) {
    throw new Error(envelope.success ? "Zuno request failed." : envelope.error.message);
  }
  return envelope.data;
}

export const getZunoStatus = () => request<ZunoStatus>("/status");
export const diagnoseWithZuno = (question: string) =>
  request<ZunoDiagnosis>("/diagnose", { question });
