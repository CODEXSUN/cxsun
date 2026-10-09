import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { EllipsisIcon, HistoryIcon, PlusIcon, SquarePenIcon, XIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@cxsun/ui/components/dropdown-menu";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { ZetroLogo } from "../../components/zetro-logo";
import type { ZetroTextAttachment } from "./chat.attachment";
import { ZetroChatForm } from "./chat.form";
import {
  useZetroConversation,
  useZetroConversations,
  zetroConversationKey,
  zetroConversationsKey
} from "./chat.hooks";
import { ZetroConversationList } from "./chat.list";
import { deleteZetroConversation, sendZetroMessage } from "./chat.services";
import type { ZetroConversation } from "./chat.types";

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
  compact = false,
  onClose
}: {
  scopeKey: string;
  compact?: boolean;
  onClose?: () => void;
}) {
  const client = useQueryClient();
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const conversations = useZetroConversations(scopeKey);
  const detail = useZetroConversation(scopeKey, currentId);
  const send = useMutation({
    mutationFn: ({ prompt, attachment }: { prompt: string; attachment?: ZetroTextAttachment }) =>
      sendZetroMessage(currentId, prompt, attachment),
    onMutate: ({ prompt, attachment }) => {
      setPendingPrompt(attachment ? `${prompt}\nFile: ${attachment.name}` : prompt);
      const previous = client.getQueryData<ZetroConversation[]>(zetroConversationsKey(scopeKey));
      if (currentId !== null && previous) {
        const active = previous.find((conversation) => conversation.id === currentId);
        if (active) {
          client.setQueryData(zetroConversationsKey(scopeKey), [
            active,
            ...previous.filter((conversation) => conversation.id !== currentId)
          ]);
        }
      }
      return { previous };
    },
    onSuccess: (result) => {
      client.setQueryData(zetroConversationKey(scopeKey, result.conversation.id), result);
      client.setQueryData<ZetroConversation[]>(zetroConversationsKey(scopeKey), (previous) => [
        result.conversation,
        ...(previous ?? []).filter((conversation) => conversation.id !== result.conversation.id)
      ]);
      setCurrentId(result.conversation.id);
      setPendingPrompt(null);
      void client.invalidateQueries({ queryKey: zetroConversationsKey(scopeKey) });
    },
    onError: (error, _prompt, context) => {
      if (context?.previous) client.setQueryData(zetroConversationsKey(scopeKey), context.previous);
      setPendingPrompt(null);
      toast.error("Zetro could not reply", { description: error.message });
    }
  });

  useEffect(() => {
    const messages = messagesRef.current;
    if (messages) messages.scrollTop = messages.scrollHeight;
  }, [detail.data?.messages.length, pendingPrompt]);
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
          ? "flex h-full min-h-0 flex-col overflow-hidden border-0 bg-transparent shadow-none"
          : "grid min-h-[65vh] overflow-hidden md:grid-cols-[16rem_minmax(0,1fr)]"
      }
    >
      {compact ? (
        <header className="flex items-center justify-between gap-2 border-b border-foreground/15 bg-background/90 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center">
              <ZetroLogo className="size-6" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold">Zetro</h2>
              <p className="text-xs text-muted-foreground">Your business coworker</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="New chat"
              title="New chat"
              disabled={send.isPending}
              onClick={() => {
                setCurrentId(null);
                setShowHistory(false);
              }}
            >
              <SquarePenIcon className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="size-8"
                  aria-label="More Zetro options"
                  title="More options"
                >
                  <EllipsisIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={6}>
                <DropdownMenuItem onSelect={() => setShowHistory((value) => !value)}>
                  <HistoryIcon className="size-4" />
                  {showHistory ? "Hide history" : "Chat history"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              aria-label="Close Zetro"
              title="Close Zetro"
              onClick={onClose}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
        </header>
      ) : null}
      {!compact || showHistory ? (
        <aside
          className={
            compact
              ? "max-h-[40%] overflow-y-auto border-b border-foreground/15 p-3"
              : "border-b p-3 md:border-b-0 md:border-r"
          }
        >
          {!compact ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="mb-3"
              disabled={send.isPending}
              onClick={() => setCurrentId(null)}
            >
              <PlusIcon className="size-4" /> New chat
            </Button>
          ) : null}
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
          {pendingPrompt && currentId === null ? (
            <p role="status" className="mb-1 truncate rounded-md bg-muted px-3 py-2 text-sm">
              {pendingPrompt.slice(0, 100)}
              <span className="ml-2 text-xs text-muted-foreground">Sending…</span>
            </p>
          ) : null}
          {conversations.data ? (
            <ZetroConversationList
              conversations={conversations.data}
              currentId={currentId}
              deleting={remove.isPending || send.isPending}
              onSelect={(id) => {
                if (send.isPending) return;
                setCurrentId(id);
                setShowHistory(false);
              }}
              onDelete={(id) => {
                if (send.isPending) return;
                if (window.confirm("Delete this conversation?")) remove.mutate(id);
              }}
            />
          ) : null}
        </aside>
      ) : null}
      <section
        className={compact ? "flex min-h-0 flex-1 flex-col" : "flex min-h-[65vh] flex-col"}
        aria-label="Zetro chat"
      >
        <div ref={messagesRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {currentId === null && !pendingPrompt ? (
            <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-3 text-center">
              <span className="grid size-12 place-items-center">
                <ZetroLogo className="size-9" />
              </span>
              <h2 className="text-xl font-semibold">How can I help with your work?</h2>
              <p className="text-sm text-muted-foreground">
                Ask about your business work and permitted records.
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
          {pendingPrompt ? (
            <>
              <div className="ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-3 text-sm text-primary-foreground">
                <p className="mb-1 text-xs font-semibold opacity-70">You</p>
                <p className="whitespace-pre-wrap break-words">{pendingPrompt}</p>
              </div>
              <div
                role="status"
                className="mr-auto max-w-[85%] rounded-xl bg-muted px-4 py-3 text-sm"
              >
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Zetro</p>
                <p className="animate-pulse text-muted-foreground">Thinking…</p>
              </div>
            </>
          ) : null}
        </div>
        <ZetroChatForm
          sending={send.isPending}
          onSend={async (prompt, attachment) => {
            await send.mutateAsync({ prompt, ...(attachment ? { attachment } : {}) });
          }}
        />
      </section>
    </Card>
  );
}
