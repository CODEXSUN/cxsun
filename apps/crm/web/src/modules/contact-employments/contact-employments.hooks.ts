import { useQuery } from "@tanstack/react-query";
import { listContactEmployments } from "./contact-employments.services";

export const contactemploymentsKey = ["crm", "contact-employments"] as const;
export function useContactEmployments(parentId: number) {
  return useQuery({
    queryKey: [...contactemploymentsKey, parentId],
    queryFn: () => listContactEmployments(parentId),
    enabled: parentId > 0
  });
}
