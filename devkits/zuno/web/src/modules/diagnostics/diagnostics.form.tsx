import { useState, type FormEvent } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import { questionSchema } from "./diagnostics.schema.js";

export function DiagnosticsForm({
  busy,
  onSubmit
}: {
  busy: boolean;
  onSubmit: (question: string) => Promise<void>;
}) {
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = questionSchema.safeParse(question);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Enter a question.");
      return;
    }
    setError("");
    await onSubmit(parsed.data);
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="zuno-question" className="text-sm font-medium">
        What is happening?
      </label>
      <Textarea
        id="zuno-question"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
        placeholder="Example: Why are tenant requests returning 403 after deployment?"
        aria-invalid={Boolean(error)}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={busy}>
        {busy ? "Investigating…" : "Investigate"}
      </Button>
    </form>
  );
}
