import { useQuery } from "@tanstack/react-query";
import { previewFrappeUsers } from "./user-sync.services";

export const frappeUsersKey = ["frappe", "users"] as const;

export function useFrappeUsers() {
  return useQuery({ queryKey: frappeUsersKey, queryFn: previewFrappeUsers, retry: false });
}
