import { useQuery } from "@tanstack/react-query";
import { listContactPreferences } from "./contact-preferences.services";

export const contactpreferencesKey = ["crm", "contact-preferences"] as const;
export function useContactPreferences(parentId: number) {
  return useQuery({
    queryKey: [...contactpreferencesKey, parentId],
    queryFn: () => listContactPreferences(parentId),
    enabled: parentId > 0
  });
}
