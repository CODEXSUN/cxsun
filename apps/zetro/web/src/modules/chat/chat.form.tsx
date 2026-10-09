import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type FormEvent
} from "react";
import { ArrowUpIcon, FileTextIcon, MicIcon, PaperclipIcon, XIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import {
  readZetroAttachment,
  type ZetroAttachmentPreview,
  type ZetroTextAttachment
} from "./chat.attachment";
import { zetroPromptSchema } from "./chat.schema";

const MAX_PROMPT_LENGTH = 8000;
const DEFAULT_FILE_QUESTION = "Summarize this file and highlight its key business information.";

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
  onSend: (prompt: string, attachment?: ZetroTextAttachment) => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [attachment, setAttachment] = useState<ZetroAttachmentPreview | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const speech = useRef<SpeechRecognitionControl | null>(null);

  useEffect(() => () => speech.current?.stop(), []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const parsed = zetroPromptSchema.safeParse(
      draft.trim() || (attachment ? DEFAULT_FILE_QUESTION : "")
    );
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid message.");
      return;
    }
    setError(null);
    const prompt = parsed.data;
    const pendingAttachment = attachment;
    setDraft("");
    setAttachment(null);
    try {
      await onSend(prompt, pendingAttachment?.attachment);
    } catch {
      setDraft(draft);
      setAttachment(pendingAttachment);
    }
  };

  const processFile = async (file: File) => {
    if (sending || readingFile) return;
    setReadingFile(true);
    setError(null);
    try {
      setAttachment(await readZetroAttachment(file));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Zetro could not read this file.");
    } finally {
      setReadingFile(false);
    }
  };

  const attachTextFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void processFile(file);
  };

  const dropFile = (event: DragEvent<HTMLFormElement>) => {
    if (!event.dataTransfer.types.includes("Files")) return;
    event.preventDefault();
    setDraggingFile(false);
    if (sending || readingFile) return;
    if (event.dataTransfer.files.length !== 1) {
      setError("Drop one file at a time.");
      return;
    }
    const file = event.dataTransfer.files[0];
    if (file) void processFile(file);
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
    <form
      onSubmit={submit}
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = sending || readingFile ? "none" : "copy";
        if (!sending && !readingFile) setDraggingFile(true);
      }}
      onDragLeave={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDraggingFile(false);
      }}
      onDrop={dropFile}
      className="relative p-3 pt-0"
    >
      {attachment ? (
        <div className="mb-2 rounded-lg border border-foreground/20 bg-background/95 p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <FileTextIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium" title={attachment.attachment.name}>
                {attachment.attachment.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {attachment.details} · {attachment.size.toLocaleString()} bytes
              </p>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-7"
              aria-label="Remove attached file"
              onClick={() => setAttachment(null)}
            >
              <XIcon className="size-4" />
            </Button>
          </div>
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-xs text-muted-foreground">
            {attachment.excerpt}
          </p>
          <p className="mt-2 text-xs font-medium text-primary">
            {attachment.attachment.content.length > 6500
              ? "Zetro will analyze the full file in parts before answering."
              : "Ready to analyze with Zetro"}
          </p>
        </div>
      ) : null}
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
          placeholder={attachment ? "Ask about this file…" : "Ask Zetro about your work…"}
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
            aria-label="Attach file"
            title="Attach or drop a text file"
            disabled={sending || readingFile}
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
            disabled={sending || readingFile || (!draft.trim() && !attachment)}
          >
            <ArrowUpIcon />
          </Button>
        </div>
      </div>
      {!attachment ? (
        <p className="px-2 pt-2 text-xs text-muted-foreground">
          {readingFile
            ? "Reading file…"
            : "Drop a .txt, .md, .csv, or .json file here, up to 1 MB."}
        </p>
      ) : null}
      {draggingFile ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary bg-background/95 text-sm font-medium shadow-lg">
          Drop file to analyze
        </div>
      ) : null}
      {error ? (
        <p id="zetro-prompt-error" role="alert" className="px-2 pt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
