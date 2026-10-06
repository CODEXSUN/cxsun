import type {
  AuditorClientCredential,
  AuditorClientRecord,
  AuditorClientSavePayload,
  AuditorCredentialPortal,
  AuditorCredentialSavePayload
} from "./client.types";

export type AuditorClientGateway = {
  list: () => Promise<AuditorClientRecord[]>;
  get: (id: number) => Promise<AuditorClientRecord>;
  create: (payload: AuditorClientSavePayload) => Promise<AuditorClientRecord>;
  update: (id: number, payload: AuditorClientSavePayload) => Promise<AuditorClientRecord>;
  listCredentials: (clientId: number) => Promise<AuditorClientCredential[]>;
  saveCredential: (
    clientId: number,
    portal: AuditorCredentialPortal,
    payload: AuditorCredentialSavePayload
  ) => Promise<AuditorClientCredential>;
  revealCredential: (clientId: number, portal: AuditorCredentialPortal) => Promise<string>;
};

export type AuditorClientRequest = <T>(path: string, options?: RequestInit) => Promise<T>;

export function createAuditorClientGateway(request: AuditorClientRequest): AuditorClientGateway {
  return {
    list: () => request<AuditorClientRecord[]>("/auditor/clients"),
    get: (id) => request<AuditorClientRecord>(`/auditor/clients/${id}`),
    create: (payload) =>
      request<AuditorClientRecord>("/auditor/clients", {
        method: "POST",
        body: JSON.stringify(payload)
      }),
    update: (id, payload) =>
      request<AuditorClientRecord>(`/auditor/clients/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      }),
    listCredentials: (clientId) =>
      request<AuditorClientCredential[]>(`/auditor/clients/${clientId}/credentials`),
    saveCredential: (clientId, portal, payload) =>
      request<AuditorClientCredential>(`/auditor/clients/${clientId}/credentials/${portal}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      }),
    revealCredential: async (clientId, portal) =>
      (
        await request<{ password: string }>(
          `/auditor/clients/${clientId}/credentials/${portal}/password`
        )
      ).password
  };
}
