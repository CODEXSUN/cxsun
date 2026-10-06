import { useQuery } from "@tanstack/react-query";
import type { AuditorClientGateway } from "./client.services";

export const auditorClientsQueryKey = ["auditor", "clients"] as const;
export const useAuditorClients = (gateway: AuditorClientGateway) =>
  useQuery({ queryKey: auditorClientsQueryKey, queryFn: gateway.list });
