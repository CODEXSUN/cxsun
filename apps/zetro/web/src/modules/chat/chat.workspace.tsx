import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { ZetroChatForm } from "./chat.form";
import {
  useZetroConversation,
  useZetroConversations,
  zetroConversationKey,
  zetroConversationsKey
} from "./chat.hooks";
import { ZetroConversationList } from "./chat.list";
import { deleteZetroConversation, sendZetroMessage } from "./chat.services";

export function ZetroChatWorkspace({ scopeKey }: { scopeKey: string }) {
  return (
    <WorkspacePage
      title="Zetro"
      description="Your business coworker"
      technicalName="page.zetro.chat"
    >
      <ZetroChatPanel scopeKey={scopeKey} />
    </WorkspacePage>
  );
}

export function ZetroChatPanel({
  scopeKey,
  compact = false
}: {
  scopeKey: string;
  compact?: boolean;
}) {
  const client = useQueryClient();
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const conversations = useZetroConversations(scopeKey);
  const detail = useZetroConversation(scopeKey, currentId);
  const send = useMutation({
    mutationFn: (prompt: string) => sendZetroMessage(currentId, prompt),
    onSuccess: async (result) => {
      setCurrentId(result.conversation.id);
      client.setQueryData(zetroConversationKey(scopeKey, result.conversation.id), result);
      await client.invalidateQueries({ queryKey: zetroConversationsKey(scopeKey) });
    },
    onError: (error) => toast.error("Zetro could not reply", { description: error.message })
  });
  const remove = useMutation({
    mutationFn: deleteZetroConversation,
    onSuccess: async (_result, id) => {
      if (currentId === id) setCurrentId(null);
      client.removeQueries({ queryKey: zetroConversationKey(scopeKey, id) });
      await client.invalidateQueries({ queryKey: zetroConversationsKey(scopeKey) });
      toast.success("Conversation deleted");
    },
    onError: (error) => toast.error("Could not delete conversation", { description: error.message })
  });

  return (
    <Card
      className={
        compact
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "grid min-h-[65vh] overflow-hidden md:grid-cols-[16rem_minmax(0,1fr)]"
      }
    >
      <aside className={compact ? "border-b p-3" : "border-b p-3 md:border-b-0 md:border-r"}>
        {compact ? (
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setCurrentId(null);
                setShowHistory(false);
              }}
            >
              <PlusIcon className="size-4" /> New chat
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              aria-expanded={showHistory}
              onClick={() => setShowHistory((value) => !value)}
            >
              History
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mb-3"
            onClick={() => setCurrentId(null)}
          >
            <PlusIcon className="size-4" /> New chat
          </Button>
        )}
        {!compact || showHistory ? (
          <>
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent chats
            </p>
            {conversations.isLoading ? (
              <p className="px-3 text-sm text-muted-foreground">Loading chats…</p>
            ) : null}
            {conversations.error ? (
              <p role="alert" className="px-3 text-sm text-destructive">
                {conversations.error.message}
              </p>
            ) : null}
            {conversations.data ? (
              <ZetroConversationList
                conversations={conversations.data}
                currentId={currentId}
                deleting={remove.isPending}
                onSelect={(id) => {
                  setCurrentId(id);
                  setShowHistory(false);
                }}
                onDelete={(id) => {
                  if (window.confirm("Delete this conversation?")) remove.mutate(id);
                }}
              />
            ) : null}
          </>
        ) : null}
      </aside>
      <section
        className={compact ? "flex min-h-0 flex-1 flex-col" : "flex min-h-[65vh] flex-col"}
        aria-label="Zetro chat"
      >
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {currentId === null ? (
            <div className="mx-auto mt-16 max-w-md text-center">
              <h2 className="text-xl font-semibold">How can I help?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Ask about your business work. Customer balances require permission.
              </p>
            </div>
          ) : null}
          {detail.isLoading ? (
            <p className="text-sm text-muted-foreground">Loading conversation…</p>
          ) : null}
          {detail.error ? (
            <p role="alert" className="text-sm text-destructive">
              {detail.error.message}
            </p>
          ) : null}
          {detail.data?.messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-xl px-4 py-3 text-sm ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted"}`}
            >
              <p className="mb-1 text-xs font-semibold opacity-70">
                {message.role === "user" ? "You" : "Zetro"}
              </p>
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          ))}
          {send.isPending ? (
            <p role="status" className="text-sm text-muted-foreground">
              Zetro is thinking…
            </p>
          ) : null}
        </div>
        <ZetroChatForm
          sending={send.isPending}
          onSend={async (prompt) => {
            await send.mutateAsync(prompt);
          }}
        />
      </section>
    </Card>
  );
}
