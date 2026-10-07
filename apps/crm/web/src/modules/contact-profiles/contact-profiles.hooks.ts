import { useQuery } from "@tanstack/react-query";
import { listContactProfiles } from "./contact-profiles.services";

export const contactprofilesKey = ["crm", "contact-profiles"] as const;
export function useContactProfiles(parentId: number) {
  return useQuery({
    queryKey: [...contactprofilesKey, parentId],
    queryFn: () => listContactProfiles(parentId),
    enabled: parentId > 0
  });
}
