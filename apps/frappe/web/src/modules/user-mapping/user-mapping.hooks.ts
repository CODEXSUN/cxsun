import { useQuery } from "@tanstack/react-query";
import { getFrappeMappingUsers, getUserMappings } from "./user-mapping.services";

export const userMappingsKey = ["frappe", "user-mappings"] as const;
export const frappeMappingUsersKey = ["frappe", "users"] as const;

export function useUserMappings() {
  return useQuery({ queryKey: userMappingsKey, queryFn: getUserMappings });
}

export function useFrappeMappingUsers() {
  return useQuery({
    queryKey: frappeMappingUsersKey,
    queryFn: getFrappeMappingUsers,
    retry: false
  });
}
