import { useQuery } from "@tanstack/react-query";
import { listContactPeople } from "./contact-people.services";

export const contactpeopleKey = ["crm", "contact-people"] as const;
export function useContactPeople(parentId: number) {
  return useQuery({
    queryKey: [...contactpeopleKey, parentId],
    queryFn: () => listContactPeople(parentId),
    enabled: parentId > 0
  });
}
