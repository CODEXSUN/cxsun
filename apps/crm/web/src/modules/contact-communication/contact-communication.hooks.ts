import { useQuery } from "@tanstack/react-query";
import { listContactCommunication } from "./contact-communication.services";

export const contactcommunicationKey = ["crm", "contact-communication"] as const;
export function useContactCommunication(parentId: number) {
  return useQuery({
    queryKey: [...contactcommunicationKey, parentId],
    queryFn: () => listContactCommunication(parentId),
    enabled: parentId > 0
  });
}
