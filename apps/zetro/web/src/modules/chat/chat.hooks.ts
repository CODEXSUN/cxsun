import { useQuery } from "@tanstack/react-query";
import { getZetroConversation, listZetroConversations } from "./chat.services";

export const zetroConversationsKey = ["zetro", "conversations"] as const;

export function useZetroConversations() {
  return useQuery({ queryKey: zetroConversationsKey, queryFn: listZetroConversations });
}

export function useZetroConversation(id: number | null) {
  return useQuery({
    queryKey: ["zetro", "conversation", id],
    queryFn: () => getZetroConversation(id!),
    enabled: id !== null
  });
}
