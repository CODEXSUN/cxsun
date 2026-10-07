import { useQuery } from "@tanstack/react-query";
import { listContactRelationships } from "./contact-relationships.services";

export const contactrelationshipsKey = ["crm", "contact-relationships"] as const;
export function useContactRelationships(parentId: number) {
  return useQuery({
    queryKey: [...contactrelationshipsKey, parentId],
    queryFn: () => listContactRelationships(parentId),
    enabled: parentId > 0
  });
}
