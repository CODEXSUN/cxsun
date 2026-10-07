import { useQuery } from "@tanstack/react-query";
import { listContactDocuments } from "./contact-documents.services";

export const contactdocumentsKey = ["crm", "contact-documents"] as const;
export function useContactDocuments(parentId: number) {
  return useQuery({
    queryKey: [...contactdocumentsKey, parentId],
    queryFn: () => listContactDocuments(parentId),
    enabled: parentId > 0
  });
}
