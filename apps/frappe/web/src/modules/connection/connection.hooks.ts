import { useQuery } from "@tanstack/react-query";
import { getFrappeConnection } from "./connection.services";

export const frappeConnectionKey = ["frappe", "connection"] as const;

export function useFrappeConnectionSettings() {
  return useQuery({ queryKey: frappeConnectionKey, queryFn: getFrappeConnection });
}
