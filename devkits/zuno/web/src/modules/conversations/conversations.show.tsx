import { useEffect, useRef } from "react";
import { CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import type { WorkMode, ZunoMessage } from "./conversations.types.js";

export function ConversationsShow({
  messages,
  pendingContent,
  mode,
  onSuggestion,
  compact
}: {
  messages: ZunoMessage[];
  pendingContent: string | null;
  mode: WorkMode;
  onSuggestion(content: string, mode: WorkMode): void;
  compact: boolean;
}) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, pendingContent]);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-8" aria-live="polite">
      <div className={`mx-auto flex w-full max-w-3xl flex-col ${compact ? "gap-4" : "gap-8"}`}>
        {messages.length === 0 && !pendingContent ? (
          <div className="flex min-h-[45vh] flex-col justify-center gap-6">
            <div>
              <Sparkles className="mb-4 size-6 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">What are we working on?</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                Bring Zuno a production issue, a code question, a review, or an idea. Choose a work
                mode below the message box.
              </p>
            </div>
            <div className="grid max-w-xl gap-2 sm:grid-cols-2">
              <Suggestion
                label="Investigate a production issue"
                onClick={() => onSuggestion("Investigate this production issue: ", "investigate")}
              />
              <Suggestion
                label="Plan a code change"
                onClick={() => onSuggestion("Plan a code change for: ", "plan")}
              />
              <Suggestion
                label="Review a module"
                onClick={() =>
                  onSuggestion("Review this module for correctness and risks: ", "review")
                }
              />
              <Suggestion
                label="Check backup and performance"
                onClick={() =>
                  onSuggestion(
                    "Help me assess today's backups and software performance.",
                    "operate"
                  )
                }
              />
            </div>
          </div>
        ) : null}
        {messages.map((message) => (
          <article
            key={message.uuid}
            className={
              message.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-3"
                : "flex gap-3"
            }
          >
            {message.role === "assistant" ? (
              <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-4" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {message.role === "assistant" ? "Zuno" : "You"}
                </span>
                <time dateTime={message.createdAt}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </time>
                {message.status === "error" ? (
                  <span className="text-destructive">Needs attention</span>
                ) : null}
              </div>
              <MessageBody content={message.content} />
              {message.evidence.length > 0 ? (
                <details className="mt-3 rounded-md border px-3 py-2 text-sm">
                  <summary className="cursor-pointer font-medium">
                    Evidence · {message.evidence.length} source
                    {message.evidence.length === 1 ? "" : "s"}
                  </summary>
                  <div className="mt-3 space-y-3">
                    {message.evidence.map((item, index) => (
                      <div key={`${item.source}-${index}`}>
                        <p className="font-medium">{item.source}</p>
                        <pre className="mt-1 max-h-52 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                          {item.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              ) : null}
            </div>
          </article>
        ))}
        {pendingContent ? (
          <>
            <article className="ml-auto max-w-[85%] rounded-2xl bg-muted px-4 py-3">
              <p className="mb-1 text-xs font-medium">You</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{pendingContent}</p>
            </article>
            <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Zuno is working in {mode} mode…
            </div>
          </>
        ) : null}
        {messages.length > 0 && !pendingContent ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="size-3.5" />
            Conversation saved
          </div>
        ) : null}
        <div ref={end} />
      </div>
    </div>
  );
}

function Suggestion({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button
      type="button"
      className="rounded-lg border px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MessageBody({ content }: { content: string }) {
  return (
    <div className="space-y-3 text-sm leading-7">
      {content.split(/(```[\s\S]*?```)/u).map((part, index) =>
        part.startsWith("```") ? (
          <pre key={index} className="overflow-x-auto rounded-lg bg-muted p-4 text-xs leading-5">
            <code>{part.replace(/^```[^\n]*\n?/u, "").replace(/```$/u, "")}</code>
          </pre>
        ) : (
          <p key={index} className="whitespace-pre-wrap break-words">
            {part}
          </p>
        )
      )}
    </div>
  );
}
