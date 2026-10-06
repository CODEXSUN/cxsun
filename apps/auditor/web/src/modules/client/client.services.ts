import type { AuditorClientRecord, AuditorClientSavePayload } from "./client.types";

export type AuditorClientGateway = {
  list: () => Promise<AuditorClientRecord[]>;
  create: (payload: AuditorClientSavePayload) => Promise<AuditorClientRecord>;
  update: (id: number, payload: AuditorClientSavePayload) => Promise<AuditorClientRecord>;
};

export type AuditorClientRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export function createAuditorClientGateway(request: AuditorClientRequest): AuditorClientGateway {
  return {
    list: () => request<AuditorClientRecord[]>("/auditor/clients"),
    create: (payload) =>
      request<AuditorClientRecord>("/auditor/clients", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    update: (id, payload) =>
      request<AuditorClientRecord>(`/auditor/clients/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      })
  };
}
