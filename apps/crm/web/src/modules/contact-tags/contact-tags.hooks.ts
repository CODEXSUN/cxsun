import { useQuery } from "@tanstack/react-query";
import { listContactTags } from "./contact-tags.services";

export const contacttagsKey = ["crm", "contact-tags"] as const;
export function useContactTags(parentId: number) {
  return useQuery({
    queryKey: [...contacttagsKey, parentId],
    queryFn: () => listContactTags(parentId),
    enabled: true
  });
}
