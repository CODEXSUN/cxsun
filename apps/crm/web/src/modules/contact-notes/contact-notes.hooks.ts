import { useQuery } from "@tanstack/react-query";
import { listContactNotes } from "./contact-notes.services";

export const contactnotesKey = ["crm", "contact-notes"] as const;
export function useContactNotes(parentId: number) {
  return useQuery({
    queryKey: [...contactnotesKey, parentId],
    queryFn: () => listContactNotes(parentId),
    enabled: parentId > 0
  });
}
