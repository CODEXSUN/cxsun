import { useQuery } from "@tanstack/react-query";
import { getFrappeConnection, getFrappeOverview } from "./overview.services";

export const frappeOverviewKey = ["frappe", "overview"] as const;

export function useFrappeOverview(page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: [...frappeOverviewKey, page, pageSize, search],
    queryFn: () => getFrappeOverview(page, pageSize, search)
  });
}

export function useFrappeConnection() {
  return useQuery({ queryKey: ["frappe", "connection"], queryFn: getFrappeConnection });
}
