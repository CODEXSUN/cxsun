import { useQuery } from "@tanstack/react-query";
import { listContactClassifications } from "./contact-classifications.services";

export const contactclassificationsKey = ["crm", "contact-classifications"] as const;
export function useContactClassifications(parentId: number) {
  return useQuery({
    queryKey: [...contactclassificationsKey, parentId],
    queryFn: () => listContactClassifications(parentId),
    enabled: parentId > 0
  });
}
