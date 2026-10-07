import { useQuery } from "@tanstack/react-query";
import { listContactRoles } from "./contact-roles.services";

export const contactrolesKey = ["crm", "contact-roles"] as const;
export function useContactRoles(parentId: number) {
  return useQuery({
    queryKey: [...contactrolesKey, parentId],
    queryFn: () => listContactRoles(parentId),
    enabled: parentId > 0
  });
}
