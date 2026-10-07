import { useQuery } from "@tanstack/react-query";
import { listContactLifecycle } from "./contact-lifecycle.services";

export const contactlifecycleKey = ["crm", "contact-lifecycle"] as const;
export function useContactLifecycle(parentId: number) {
  return useQuery({
    queryKey: [...contactlifecycleKey, parentId],
    queryFn: () => listContactLifecycle(parentId),
    enabled: parentId > 0
  });
}
