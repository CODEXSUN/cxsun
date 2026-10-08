import { useState, type FormEvent } from "react";
import { SendIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import { zetroPromptSchema } from "./chat.schema";

export function ZetroChatForm({
  sending,
  onSend
}: {
  sending: boolean;
  onSend: (prompt: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = zetroPromptSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid message.");
      return;
    }
    setError(null);
    try {
      await onSend(parsed.data);
      setDraft("");
    } catch {
      // Keep the draft so the user can retry after the workspace shows the error.
    }
  };
  return (
    <form onSubmit={submit} className="border-t p-4">
      <label htmlFor="zetro-message" className="sr-only">
        Message Zetro
      </label>
      <Textarea
        id="zetro-message"
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setError(null);
        }}
        placeholder="Ask Zetro about your business…"
        rows={3}
        maxLength={8000}
        disabled={sending}
        aria-invalid={Boolean(error)}
      />
      <div className="mt-2 flex items-center justify-between gap-2">
        <p
          role={error ? "alert" : undefined}
          className={error ? "text-sm text-destructive" : "text-xs text-muted-foreground"}
        >
          {error ?? "Business questions and permitted records only."}
        </p>
        <Button type="submit" disabled={sending || !draft.trim()}>
          <SendIcon className="size-4" /> {sending ? "Thinking…" : "Send"}
        </Button>
      </div>
    </form>
  );
}
