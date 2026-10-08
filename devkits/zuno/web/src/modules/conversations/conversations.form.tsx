import { useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import { messageSchema } from "./conversations.schema.js";
import type { WorkMode } from "./conversations.types.js";

export const modeOptions: Array<{ value: WorkMode; label: string; description: string }> = [
  { value: "ask", label: "Ask", description: "Questions and explanations" },
  { value: "investigate", label: "Investigate", description: "Inspect code and logs" },
  { value: "plan", label: "Plan", description: "Scope and sequence work" },
  { value: "build", label: "Build", description: "Propose implementation" },
  { value: "review", label: "Review", description: "Find risks and defects" },
  { value: "operate", label: "Operate", description: "Production triage" }
];

export function ConversationsForm({
  mode,
  busy,
  onModeChange,
  onSend,
  initialText = ""
}: {
  mode: WorkMode;
  busy: boolean;
  onModeChange(mode: WorkMode): void;
  onSend(content: string): Promise<void>;
  initialText?: string;
}) {
  const [draft, setDraft] = useState(initialText);
  const [error, setError] = useState("");
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const parsed = messageSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Write a message first.");
      return;
    }
    setError("");
    try {
      await onSend(parsed.data);
      setDraft("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Zuno could not send the message.");
    }
  }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (!busy) void submit();
    }
  }
  return (
    <form
      className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2"
      onSubmit={(event) => void submit(event)}
    >
      {error ? (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="rounded-2xl border bg-card p-3 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <Textarea
          aria-label="Message Zuno"
          placeholder="Ask Zuno to investigate, plan, review, or help with an incident…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          maxLength={20_000}
          disabled={busy}
          className="min-h-20 resize-y border-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-xs text-muted-foreground">Mode</span>
            <div className="w-40">
              <WorkspaceSelect
                ariaLabel="Work mode"
                value={mode}
                onValueChange={(value) => onModeChange(value as WorkMode)}
                options={modeOptions.map(({ value, label }) => ({ value, label }))}
              />
            </div>
          </div>
          <Button
            type="submit"
            size="icon"
            className="shrink-0 rounded-full"
            disabled={busy || !draft.trim()}
            aria-label="Send message"
          >
            {busy ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
      </div>
      <p className="pt-2 text-center text-xs text-muted-foreground">
        Enter to send · Shift+Enter for a new line · Production changes use Cases for approval.
      </p>
    </form>
  );
}
