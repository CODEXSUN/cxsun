import { useQuery } from "@tanstack/react-query";
import { getWatchSnapshot } from "./watch.services.js";

export function useWatchSnapshot() {
  return useQuery({
    queryKey: ["zuno", "watch"],
    queryFn: getWatchSnapshot,
    refetchInterval: 60_000
  });
}
