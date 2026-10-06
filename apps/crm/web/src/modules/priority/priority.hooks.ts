import { useQuery } from "@tanstack/react-query";
import { listPriority } from "./priority.services";

export const priorityQueryKey = ["crm", "priority"] as const;
export const usePriority = () =>
  useQuery({
    queryKey: priorityQueryKey,
    queryFn: listPriority
  });
