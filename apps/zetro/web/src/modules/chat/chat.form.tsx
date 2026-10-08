import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowUpIcon, MicIcon, PaperclipIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import { zetroPromptSchema } from "./chat.schema";

const MAX_PROMPT_LENGTH = 8000;
const TEXT_FILE_EXTENSIONS = /\.(csv|json|md|txt)$/iu;

type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionControl = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionBrowser = Window & {
  SpeechRecognition?: new () => SpeechRecognitionControl;
  webkitSpeechRecognition?: new () => SpeechRecognitionControl;
};

export function ZetroChatForm({
  sending,
  onSend
}: {
  sending: boolean;
  onSend: (prompt: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const speech = useRef<SpeechRecognitionControl | null>(null);

  useEffect(() => () => speech.current?.stop(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = zetroPromptSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid message.");
      return;
    }
    setError(null);
    const prompt = parsed.data;
    setDraft("");
    try {
      await onSend(prompt);
    } catch {
      setDraft(prompt);
    }
  };

  const attachTextFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!TEXT_FILE_EXTENSIONS.test(file.name)) {
      setError("Attach a .txt, .md, .csv, or .json file.");
      return;
    }
    if (file.size > MAX_PROMPT_LENGTH) {
      setError("This file is too large for one message. Choose a file under 8 KB.");
      return;
    }
    try {
      const content = await file.text();
      const attachment = `[Attached text file: ${file.name}]\n${content}`;
      const nextDraft = draft ? `${draft}\n\n${attachment}` : attachment;
      if (nextDraft.length > MAX_PROMPT_LENGTH) {
        setError("The message and attachment exceed 8,000 characters.");
        return;
      }
      setDraft(nextDraft);
      setError(null);
    } catch {
      setError("Zetro could not read this file.");
    }
  };

  const toggleVoice = () => {
    if (listening) {
      speech.current?.stop();
      return;
    }
    const browser = window as SpeechRecognitionBrowser;
    const Recognition = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input is not available in this browser.");
      return;
    }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const words = event.results[0]?.[0]?.transcript.trim();
      if (!words) return;
      setDraft((current) => `${current}${current ? " " : ""}${words}`.slice(0, MAX_PROMPT_LENGTH));
      setError(null);
    };
    recognition.onerror = (event) => {
      if (event.error !== "aborted") setError("Voice input stopped. Check microphone access.");
      setListening(false);
    };
    recognition.onend = () => {
      setListening(false);
      speech.current = null;
    };
    speech.current = recognition;
    try {
      recognition.start();
      setListening(true);
      setError(null);
    } catch {
      speech.current = null;
      setError("Voice input could not start.");
    }
  };

  return (
    <form onSubmit={submit} className="p-3 pt-0">
      <div className="rounded-2xl border bg-background p-3 shadow-md">
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
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="Ask Zetro about your work…"
          rows={2}
          maxLength={MAX_PROMPT_LENGTH}
          disabled={sending}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "zetro-prompt-error" : undefined}
          className="max-h-40 min-h-12 resize-none border-0 bg-transparent px-1 py-1 shadow-none focus-visible:ring-0"
        />
        <div className="mt-2 flex items-center gap-1">
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json"
            className="sr-only"
            tabIndex={-1}
            onChange={attachTextFile}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 rounded-full"
            aria-label="Attach text file"
            title="Attach text file"
            disabled={sending}
            onClick={() => fileInput.current?.click()}
          >
            <PaperclipIcon />
          </Button>
          <div className="flex-1" />
          <Button
            type="button"
            variant={listening ? "secondary" : "ghost"}
            size="icon"
            className="size-9 rounded-full"
            aria-label={listening ? "Stop voice input" : "Start voice input"}
            title={listening ? "Stop listening" : "Voice input"}
            aria-pressed={listening}
            disabled={sending}
            onClick={toggleVoice}
          >
            <MicIcon />
          </Button>
          <Button
            type="submit"
            size="icon"
            className="size-9 rounded-full"
            aria-label={sending ? "Sending message" : "Send message"}
            title="Send message"
            disabled={sending || !draft.trim()}
          >
            <ArrowUpIcon />
          </Button>
        </div>
      </div>
      {error ? (
        <p id="zetro-prompt-error" role="alert" className="px-2 pt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
