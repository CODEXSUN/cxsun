import { Trash2Icon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import type { ZetroConversation } from "./chat.types";

export function ZetroConversationList({
  conversations,
  currentId,
  deleting,
  onSelect,
  onDelete
}: {
  conversations: ZetroConversation[];
  currentId: number | null;
  deleting: boolean;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  if (!conversations.length)
    return <p className="px-3 py-6 text-sm text-muted-foreground">No conversations yet.</p>;
  return (
    <ul className="space-y-1" aria-label="Conversations">
      {conversations.map((conversation) => (
        <li key={conversation.id} className="group flex items-center gap-1">
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            className={`min-w-0 flex-1 truncate rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${currentId === conversation.id ? "bg-muted font-medium" : ""}`}
            aria-current={currentId === conversation.id ? "page" : undefined}
          >
            {conversation.title}
          </button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={deleting}
            aria-label={`Delete ${conversation.title}`}
            onClick={() => onDelete(conversation.id)}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
