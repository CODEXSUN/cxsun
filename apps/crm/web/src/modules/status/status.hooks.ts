import { useQuery } from "@tanstack/react-query";
import { listStatus } from "./status.services";

export const statusQueryKey = ["crm", "status"] as const;
export const useStatus = () =>
  useQuery({
    queryKey: statusQueryKey,
    queryFn: listStatus
  });
