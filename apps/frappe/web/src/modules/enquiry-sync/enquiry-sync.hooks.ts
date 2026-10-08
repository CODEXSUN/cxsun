import { useQuery } from "@tanstack/react-query";
import { getConnectionState, getLocalEnquiries, getRemoteEnquiries } from "./enquiry-sync.services";

export const remoteEnquiriesKey = ["frappe", "enquiry-sync", "remote"] as const;
export const localEnquiriesKey = ["frappe", "overview"] as const;

export function useRemoteEnquiries(active: boolean) {
  return useQuery({
    queryKey: remoteEnquiriesKey,
    queryFn: getRemoteEnquiries,
    enabled: active
  });
}

export function useLocalEnquiries(active: boolean, page: number, pageSize: number, search: string) {
  return useQuery({
    queryKey: [...localEnquiriesKey, page, pageSize, search],
    queryFn: () => getLocalEnquiries(page, pageSize, search),
    enabled: active
  });
}

export function useConnectionState() {
  return useQuery({ queryKey: ["frappe", "connection"], queryFn: getConnectionState });
}
