import { useState } from "react";
import { Archive, MessageSquarePlus, Pencil, RotateCcw, Search, X } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import type { ZunoThread } from "./conversations.types.js";

export function ConversationsList({
  threads,
  selectedUuid,
  archived,
  busy,
  onNew,
  onOpen,
  onArchiveView,
  onArchive,
  onRestore,
  onRename
}: {
  threads: ZunoThread[];
  selectedUuid: string | null;
  archived: boolean;
  busy: boolean;
  onNew(): void;
  onOpen(uuid: string): void;
  onArchiveView(value: boolean): void;
  onArchive(uuid: string): Promise<void>;
  onRestore(uuid: string): Promise<void>;
  onRename(uuid: string, title: string): Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const matches = threads.filter((thread) =>
    thread.title.toLowerCase().includes(search.trim().toLowerCase())
  );
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r bg-muted/20">
      <div className="flex items-center justify-between px-4 py-4">
        <div>
          <p className="text-lg font-semibold tracking-tight">Zuno</p>
          <p className="text-xs text-muted-foreground">Developer coworker</p>
        </div>
        <Button type="button" size="icon" variant="ghost" aria-label="New chat" onClick={onNew}>
          <MessageSquarePlus />
        </Button>
      </div>
      <div className="space-y-3 px-3 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            aria-label="Search conversations"
            placeholder="Search history"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={!archived ? "secondary" : "ghost"}
            className="flex-1"
            onClick={() => onArchiveView(false)}
          >
            Recent
          </Button>
          <Button
            type="button"
            size="sm"
            variant={archived ? "secondary" : "ghost"}
            className="flex-1"
            onClick={() => onArchiveView(true)}
          >
            Archived
          </Button>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto px-2 pb-4"
        aria-label={archived ? "Archived conversations" : "Recent conversations"}
      >
        {matches.length === 0 ? (
          <p className="px-3 py-5 text-sm text-muted-foreground">
            {search
              ? "No matching conversations."
              : archived
                ? "No archived conversations."
                : "Your conversations will appear here."}
          </p>
        ) : null}
        <ul className="space-y-1">
          {matches.map((thread) => (
            <li
              key={thread.uuid}
              className={`group rounded-md ${selectedUuid === thread.uuid ? "bg-accent" : "hover:bg-accent/60"}`}
            >
              {editing === thread.uuid ? (
                <form
                  className="flex gap-1 p-1"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void onRename(thread.uuid, title)
                      .then(() => setEditing(null))
                      .catch(() => undefined);
                  }}
                >
                  <Input
                    autoFocus
                    aria-label="Conversation title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={255}
                  />
                  <Button size="sm" type="submit" disabled={!title.trim() || busy}>
                    Save
                  </Button>
                </form>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    onClick={() => onOpen(thread.uuid)}
                  >
                    <span className="block truncate text-sm font-medium">{thread.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      {thread.mode} · {new Date(thread.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  {!archived ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8 shrink-0"
                      disabled={busy}
                      aria-label={`Rename ${thread.title}`}
                      onClick={() => {
                        setEditing(thread.uuid);
                        setTitle(thread.title);
                      }}
                    >
                      <Pencil />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mr-1 size-8 shrink-0"
                    disabled={busy}
                    aria-label={archived ? `Restore ${thread.title}` : `Archive ${thread.title}`}
                    onClick={() =>
                      void (archived ? onRestore(thread.uuid) : onArchive(thread.uuid)).catch(
                        () => undefined
                      )
                    }
                  >
                    {archived ? <RotateCcw /> : <Archive />}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t px-3 py-3 text-xs text-muted-foreground">
        <p>History is saved in the Platform database.</p>
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-1 underline"
          onClick={() => setSearch("")}
        >
          <X className="size-3" /> Clear search
        </button>
      </div>
    </aside>
  );
}
