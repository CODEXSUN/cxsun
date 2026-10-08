import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { ZetroChatForm } from "./chat.form";
import { useZetroConversation, useZetroConversations, zetroConversationsKey } from "./chat.hooks";
import { ZetroConversationList } from "./chat.list";
import { deleteZetroConversation, sendZetroMessage } from "./chat.services";

export function ZetroChatWorkspace() {
  const client = useQueryClient();
  const [currentId, setCurrentId] = useState<number | null>(null);
  const conversations = useZetroConversations();
  const detail = useZetroConversation(currentId);
  const send = useMutation({
    mutationFn: (prompt: string) => sendZetroMessage(currentId, prompt),
    onSuccess: async (result) => {
      setCurrentId(result.conversation.id);
      client.setQueryData(["zetro", "conversation", result.conversation.id], result);
      await client.invalidateQueries({ queryKey: zetroConversationsKey });
    },
    onError: (error) => toast.error("Zetro could not reply", { description: error.message })
  });
  const remove = useMutation({
    mutationFn: deleteZetroConversation,
    onSuccess: async (_result, id) => {
      if (currentId === id) setCurrentId(null);
      client.removeQueries({ queryKey: ["zetro", "conversation", id] });
      await client.invalidateQueries({ queryKey: zetroConversationsKey });
      toast.success("Conversation deleted");
    },
    onError: (error) => toast.error("Could not delete conversation", { description: error.message })
  });

  return (
    <WorkspacePage
      title="Zetro"
      description="Your AI coworker"
      technicalName="page.zetro.chat"
      actions={
        <Button type="button" variant="outline" onClick={() => setCurrentId(null)}>
          <PlusIcon className="size-4" /> New chat
        </Button>
      }
    >
      <Card className="grid min-h-[65vh] overflow-hidden md:grid-cols-[16rem_minmax(0,1fr)]">
        <aside className="border-b p-3 md:border-b-0 md:border-r">
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
              onSelect={setCurrentId}
              onDelete={(id) => {
                if (window.confirm("Delete this conversation?")) remove.mutate(id);
              }}
            />
          ) : null}
        </aside>
        <section className="flex min-h-[65vh] flex-col" aria-label="Zetro chat">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {currentId === null ? (
              <div className="mx-auto mt-16 max-w-md text-center">
                <h2 className="text-xl font-semibold">How can I help?</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ask a question, draft a message, or plan your next steps.
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
    </WorkspacePage>
  );
}
