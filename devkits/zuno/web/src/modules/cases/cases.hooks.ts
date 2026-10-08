import { useQuery } from "@tanstack/react-query";
import { getCase, listCases, listTenantTargets } from "./cases.services.js";

export const casesQueryKey = ["zuno", "cases"] as const;
export function useCases() {
  return useQuery({ queryKey: casesQueryKey, queryFn: listCases });
}
export function useCase(uuid: string | null) {
  return useQuery({
    queryKey: ["zuno", "cases", uuid],
    queryFn: () => getCase(uuid!),
    enabled: Boolean(uuid)
  });
}
export function useTenantTargets() {
  return useQuery({ queryKey: ["zuno", "tenant-targets"], queryFn: listTenantTargets });
}
