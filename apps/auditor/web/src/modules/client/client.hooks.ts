import { useQuery } from "@tanstack/react-query";
import type { AuditorClientGateway } from "./client.services";

export const auditorClientsQueryKey = ["auditor", "clients"] as const;
export const useAuditorClients = (gateway: AuditorClientGateway) =>
  useQuery({ queryKey: auditorClientsQueryKey, queryFn: gateway.list });

export const useAuditorClient = (gateway: AuditorClientGateway, id: number | null) =>
  useQuery({
    queryKey: [...auditorClientsQueryKey, id],
    queryFn: () => {
      if (id === null) throw new Error("Client is not selected.");
      return gateway.get(id);
    },
    enabled: id !== null
  });

export const auditorClientCredentialsQueryKey = (clientId: number) =>
  [...auditorClientsQueryKey, clientId, "credentials"] as const;

export const useAuditorClientCredentials = (gateway: AuditorClientGateway, clientId: number) =>
  useQuery({
    queryKey: auditorClientCredentialsQueryKey(clientId),
    queryFn: () => gateway.listCredentials(clientId)
  });
