import { useQuery } from "@tanstack/react-query";
import { getConversation, listConversations } from "./conversations.services.js";

export const conversationListKey = (archived: boolean) =>
  ["zuno", "conversations", archived] as const;
export const conversationKey = (uuid: string | null) => ["zuno", "conversation", uuid] as const;

export function useConversations(archived: boolean) {
  return useQuery({
    queryKey: conversationListKey(archived),
    queryFn: () => listConversations(archived)
  });
}

export function useConversation(uuid: string | null) {
  return useQuery({
    queryKey: conversationKey(uuid),
    queryFn: () => getConversation(uuid!),
    enabled: Boolean(uuid),
    refetchInterval: (query) => (query.state.data?.thread.status === "busy" ? 5_000 : false)
  });
}
