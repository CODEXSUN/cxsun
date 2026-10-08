import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  FileCode2,
  Menu,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  SlidersHorizontal
} from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { CasesWorkspace } from "../cases/index.js";
import { WatchWorkspace } from "../watch/index.js";
import { useZunoStatus } from "../diagnostics/diagnostics.hooks.js";
import { ConversationsForm, modeOptions } from "./conversations.form.js";
import { conversationKey, useConversation, useConversations } from "./conversations.hooks.js";
import { ConversationsList } from "./conversations.list.js";
import { ConversationsShow } from "./conversations.show.js";
import {
  archiveConversation,
  createConversation,
  recoverConversation,
  renameConversation,
  restoreConversation,
  sendMessage
} from "./conversations.services.js";
import type { WorkMode } from "./conversations.types.js";

type View = "chat" | "cases" | "watch";

export function ConversationsWorkspace() {
  const client = useQueryClient();
  const [view, setView] = useState<View>("chat");
  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [mode, setMode] = useState<WorkMode>("ask");
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [starter, setStarter] = useState("");
  const [starterKey, setStarterKey] = useState(0);
  const [showSidebar, setShowSidebar] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 768
  );
  const [showContext, setShowContext] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1280
  );
  const [showTweak, setShowTweak] = useState(false);
  const [compact, setCompact] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const threads = useConversations(archived);
  const conversation = useConversation(selectedUuid);
  const status = useZunoStatus();

  const manage = useMutation({
    mutationFn: async (task: () => Promise<unknown>) => task(),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["zuno", "conversations"] });
      await client.invalidateQueries({ queryKey: conversationKey(selectedUuid) });
    }
  });
  const send = useMutation({
    mutationFn: async (content: string) => {
      let uuid = selectedUuid;
      if (!uuid) {
        const created = await createConversation(mode);
        uuid = created.uuid;
        setSelectedUuid(uuid);
      }
      const result = await sendMessage(uuid, content, mode);
      client.setQueryData(conversationKey(uuid), result);
      await client.invalidateQueries({ queryKey: ["zuno", "conversations"] });
      return result;
    }
  });

  function newChat() {
    setPendingContent(null);
    if (window.innerWidth < 768) setShowSidebar(false);
    setSelectedUuid(null);
    setArchived(false);
    setView("chat");
    setMode("ask");
    setStarter("");
    setStarterKey((key) => key + 1);
  }
  function openChat(uuid: string) {
    setPendingContent(null);
    if (window.innerWidth < 768) setShowSidebar(false);
    setSelectedUuid(uuid);
    setView("chat");
    setStarter("");
    setStarterKey((key) => key + 1);
    const thread = threads.data?.find((item) => item.uuid === uuid);
    if (thread) setMode(thread.mode);
  }
  function suggest(content: string, nextMode: WorkMode) {
    setMode(nextMode);
    setStarter(content);
    setStarterKey((key) => key + 1);
  }
  async function submit(content: string) {
    setPendingContent(content);
    try {
      await send.mutateAsync(content);
      setStarter("");
    } finally {
      setPendingContent(null);
    }
  }
  async function archive(uuid: string) {
    await manage.mutateAsync(() => archiveConversation(uuid));
    if (selectedUuid === uuid) setSelectedUuid(null);
  }
  async function restore(uuid: string) {
    await manage.mutateAsync(() => restoreConversation(uuid));
    setArchived(false);
    setSelectedUuid(uuid);
  }
  async function rename(uuid: string, title: string) {
    await manage.mutateAsync(() => renameConversation(uuid, title));
  }
  async function recover(uuid: string) {
    setRecoveryError("");
    try {
      const result = await recoverConversation(uuid);
      client.setQueryData(conversationKey(uuid), result);
      await client.invalidateQueries({ queryKey: ["zuno", "conversations"] });
    } catch (cause) {
      setRecoveryError(cause instanceof Error ? cause.message : "Recovery failed.");
    }
  }

  const detail = conversation.data;
  const currentMode = modeOptions.find((item) => item.value === mode)!;
  return (
    <div className="relative flex h-[calc(100dvh-10rem)] min-h-[620px] overflow-hidden border-t bg-background">
      {showSidebar ? (
        <div className="absolute inset-y-0 left-0 z-20 shadow-xl md:static md:shadow-none">
          <ConversationsList
            threads={threads.data ?? []}
            selectedUuid={selectedUuid}
            archived={archived}
            busy={manage.isPending || send.isPending}
            onNew={newChat}
            onOpen={openChat}
            onArchiveView={setArchived}
            onArchive={archive}
            onRestore={restore}
            onRename={rename}
          />
        </div>
      ) : null}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showSidebar ? "Hide history" : "Show history"}
              onClick={() => setShowSidebar((value) => !value)}
            >
              <Menu />
            </Button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {view === "chat"
                  ? (detail?.thread.title ?? "New conversation")
                  : view === "cases"
                    ? "Operations cases"
                    : "Operations watch"}
              </p>
              <p className="text-xs text-muted-foreground">
                {view === "chat" ? currentMode.description : "Zuno workspace"}
              </p>
            </div>
          </div>
          <nav aria-label="Zuno work areas" className="flex items-center gap-1">
            <AreaButton
              active={view === "chat"}
              label="Chat"
              onClick={() => setView("chat")}
              icon={<MessageSquare />}
            />
            <AreaButton
              active={view === "cases"}
              label="Cases"
              onClick={() => setView("cases")}
              icon={<FileCode2 />}
            />
            <AreaButton
              active={view === "watch"}
              label="Watch"
              onClick={() => setView("watch")}
              icon={<Activity />}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={showContext ? "Hide work context" : "Show work context"}
              onClick={() => setShowContext((value) => !value)}
            >
              {showContext ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
          </nav>
        </header>
        {view === "chat" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {conversation.error ? (
              <p role="alert" className="px-5 pt-4 text-sm text-destructive">
                {conversation.error.message}
              </p>
            ) : null}
            {threads.error ? (
              <p role="alert" className="px-5 pt-4 text-sm text-destructive">
                History: {threads.error.message}
              </p>
            ) : null}
            {manage.error ? (
              <p role="alert" className="px-5 pt-4 text-sm text-destructive">
                {manage.error.message}
              </p>
            ) : null}
            {recoveryError ? (
              <p role="alert" className="px-5 pt-4 text-sm text-destructive">
                {recoveryError}
              </p>
            ) : null}
            {selectedUuid && conversation.isLoading ? (
              <p role="status" className="flex-1 p-6 text-sm text-muted-foreground">
                Loading conversation…
              </p>
            ) : (
              <ConversationsShow
                messages={detail?.messages ?? []}
                pendingContent={pendingContent}
                mode={mode}
                onSuggestion={suggest}
                compact={compact}
              />
            )}
            {detail?.thread.status === "archived" ? (
              <div className="border-t p-4 text-center text-sm text-muted-foreground">
                This conversation is archived. Restore it from history to continue.
              </div>
            ) : detail?.thread.status === "busy" ? (
              <div className="flex items-center justify-center gap-3 border-t p-4 text-sm text-muted-foreground">
                <span>Zuno is working on this conversation.</span>
                {Date.now() - new Date(detail.thread.updatedAt).getTime() > 10 * 60_000 ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void recover(detail.thread.uuid)}
                  >
                    Recover stalled run
                  </Button>
                ) : null}
              </div>
            ) : (
              <ConversationsForm
                key={`${selectedUuid ?? "new"}-${starterKey}`}
                mode={mode}
                busy={send.isPending || (Boolean(selectedUuid) && conversation.isLoading)}
                onModeChange={setMode}
                onSend={submit}
                initialText={starter}
              />
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            {view === "cases" ? <CasesWorkspace /> : <WatchWorkspace />}
          </div>
        )}
      </main>
      {showContext ? (
        <aside className="absolute inset-y-0 right-0 z-20 h-full w-64 shrink-0 border-l bg-background p-5 shadow-xl xl:static xl:bg-muted/10 xl:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Work context
          </p>
          <h2 className="mt-5 text-base font-semibold">{currentMode.label}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{currentMode.description}</p>
          <div className="mt-8 space-y-3 border-t pt-5 text-sm">
            <p className="font-medium">Available evidence</p>
            <StatusLine label="Source checkout" ready={Boolean(status.data?.sourceReady)} />
            <StatusLine label="Platform logs" ready={Boolean(status.data?.logReady)} />
            <StatusLine label="Model provider" ready={Boolean(status.data?.modelReady)} />
          </div>
          <div className="mt-8 space-y-2 border-t pt-5">
            <p className="text-sm font-medium">For production work</p>
            <p className="text-sm leading-6 text-muted-foreground">
              Use a Case to record the target, proposal, approval, and verification before any SQL
              change.
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setView("cases")}>
              Open cases
            </Button>
          </div>
        </aside>
      ) : null}
      <div className="absolute bottom-24 right-4 z-10 flex flex-col items-end gap-2 xl:bottom-4">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bg-background shadow-sm"
          onClick={() => setShowTweak((value) => !value)}
          aria-expanded={showTweak}
        >
          <SlidersHorizontal /> View
        </Button>
        {showTweak ? (
          <div className="w-52 rounded-lg border bg-card p-3 shadow-lg">
            <p className="text-xs font-semibold">Conversation view</p>
            <div className="mt-3 flex gap-1">
              <Button
                type="button"
                size="sm"
                variant={compact ? "secondary" : "ghost"}
                onClick={() => setCompact(true)}
              >
                Compact
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!compact ? "secondary" : "ghost"}
                onClick={() => setCompact(false)}
              >
                Relaxed
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2 w-full justify-start"
              onClick={() => setShowContext((value) => !value)}
            >
              {showContext ? "Hide" : "Show"} work context
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AreaButton({
  active,
  label,
  icon,
  onClick
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick(): void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function StatusLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className={ready ? "text-emerald-700" : "text-amber-700"}>
        {ready ? "Ready" : "Unavailable"}
      </span>
    </div>
  );
}
