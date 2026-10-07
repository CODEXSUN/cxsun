import { useQuery } from "@tanstack/react-query";
import { listContactPersonTags } from "./contact-person-tags.services";

export const contactpersontagsKey = ["crm", "contact-person-tags"] as const;
export function useContactPersonTags(parentId: number) {
  return useQuery({
    queryKey: [...contactpersontagsKey, parentId],
    queryFn: () => listContactPersonTags(parentId),
    enabled: parentId > 0
  });
}
