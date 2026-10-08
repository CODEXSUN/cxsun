import { useQuery } from "@tanstack/react-query";
import { getZetroConversation, listZetroConversations } from "./chat.services";

export const zetroConversationsKey = (scopeKey: string) =>
  ["zetro", scopeKey, "conversations"] as const;
export const zetroConversationKey = (scopeKey: string, id: number) =>
  ["zetro", scopeKey, "conversation", id] as const;

export function useZetroConversations(scopeKey: string) {
  return useQuery({ queryKey: zetroConversationsKey(scopeKey), queryFn: listZetroConversations });
}

export function useZetroConversation(scopeKey: string, id: number | null) {
  return useQuery({
    queryKey: zetroConversationKey(scopeKey, id ?? 0),
    queryFn: () => getZetroConversation(id!),
    enabled: id !== null,
    refetchInterval: id === null ? false : 15_000
  });
}
