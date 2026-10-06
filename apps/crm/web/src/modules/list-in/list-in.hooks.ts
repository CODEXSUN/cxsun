import { useQuery } from "@tanstack/react-query";
import { listListIn } from "./list-in.services";

export const listInQueryKey = ["crm", "list-in"] as const;
export const useListIn = () =>
  useQuery({
    queryKey: listInQueryKey,
    queryFn: listListIn
  });
