import { useQuery } from "@tanstack/react-query";
import { getZunoStatus } from "./diagnostics.services.js";

export function useZunoStatus() {
  return useQuery({ queryKey: ["zuno", "status"], queryFn: getZunoStatus });
}
