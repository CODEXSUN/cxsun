import { useEffect, useState } from "react";
import {
  ArrowLeftIcon,
  PanelRightCloseIcon,
  PanelRightOpenIcon,
  RotateCcwIcon,
  SaveIcon
} from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceEditor } from "@cxsun/ui/workspace/editor";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import { IdeaStatusBadge } from "./ideas.list";
import { ideaSaveSchema } from "./ideas.schema";
import type { Idea, IdeaSavePayload } from "./ideas.types";

const categoryOptions = [
  { label: "General", swatchClassName: "bg-slate-400", value: "general" },
  { label: "Product", swatchClassName: "bg-blue-500", value: "product" },
  { label: "Engineering", swatchClassName: "bg-violet-500", value: "engineering" },
  { label: "Design", swatchClassName: "bg-pink-500", value: "design" },
  { label: "Research", swatchClassName: "bg-teal-500", value: "research" }
];
const statusOptions = [
  { label: "Draft", swatchClassName: "bg-slate-400", value: "draft" },
  { label: "Open", swatchClassName: "bg-blue-500", value: "open" },
  { label: "Planning", swatchClassName: "bg-amber-500", value: "planning" },
  { label: "In progress", swatchClassName: "bg-cyan-500", value: "in-progress" },
  { label: "Blocked", swatchClassName: "bg-red-500", value: "blocked" },
  { label: "Completed", swatchClassName: "bg-emerald-500", value: "completed" },
  { label: "Archived", swatchClassName: "bg-slate-400", value: "archived" }
];

const emptyIdea: IdeaSavePayload = {
  assignee: "",
  category: "general",
  content: "",
  status: "draft",
  title: ""
};

export function IdeasForm({
  idea,
  onBack,
  onSave,
  saving
}: {
  idea: Idea | null;
  onBack: () => void;
  onSave: (draft: IdeaSavePayload) => Promise<void>;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<IdeaSavePayload>(formValues(idea));
  const [error, setError] = useState("");
  const [propertiesOpen, setPropertiesOpen] = useState(true);
  const [savedSignature, setSavedSignature] = useState(JSON.stringify(formValues(idea)));
  const dirty = JSON.stringify(draft) !== savedSignature;

  useEffect(() => {
    setDraft(formValues(idea));
    setSavedSignature(JSON.stringify(formValues(idea)));
    setError("");
  }, [idea]);

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  });

  async function save() {
    if (saving) return;
    const parsed = ideaSaveSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Review the idea fields.");
      return;
    }
    setError("");
    try {
      await onSave(parsed.data);
      setSavedSignature(JSON.stringify(parsed.data));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The idea could not be saved.");
    }
  }

  function back() {
    if (dirty && !window.confirm("Discard unsaved changes to this idea?")) return;
    onBack();
  }

  return (
    <WorkspacePage
      className="max-w-none"
      title={idea ? "Edit idea" : "New idea"}
      description="Capture the problem, proposal, and feedback in one place."
      actions={
        <>
          <Button onClick={back} type="button" variant="outline">
            <ArrowLeftIcon /> Back
          </Button>
          <Button
            aria-label={propertiesOpen ? "Hide properties" : "Show properties"}
            onClick={() => setPropertiesOpen((value) => !value)}
            size="icon"
            title={propertiesOpen ? "Hide properties" : "Show properties"}
            type="button"
            variant="outline"
          >
            {propertiesOpen ? <PanelRightCloseIcon /> : <PanelRightOpenIcon />}
          </Button>
          <Button
            disabled={!dirty || saving}
            onClick={() => {
              setDraft(formValues(idea));
              setError("");
            }}
            type="button"
            variant="outline"
          >
            <RotateCcwIcon /> Discard
          </Button>
          <Button disabled={!dirty || saving} onClick={() => void save()} type="button">
            <SaveIcon /> {saving ? "Saving…" : idea ? "Update" : "Save idea"}
          </Button>
        </>
      }
    >
      {error ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className={`grid gap-5 ${propertiesOpen ? "xl:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}>
        <div className="min-w-0 space-y-4">
          <Input
            aria-label="Idea title"
            autoFocus
            className="h-12 bg-background px-4 text-base font-medium"
            maxLength={255}
            onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
            placeholder="Give this idea a clear title"
            value={draft.title}
          />
          <WorkspaceEditor
            className="[&_.ProseMirror]:min-h-[28rem]"
            content={draft.content}
            onChange={(content) => setDraft((current) => ({ ...current, content }))}
            placeholder="Explain the problem, proposal, trade-offs, and feedback you need…"
          />
          <p className="text-xs text-muted-foreground">
            Use #tags in the content to make ideas easier to find.
          </p>
        </div>
        {propertiesOpen ? (
          <aside
            className="space-y-5 border-t border-border/70 pt-4 xl:border-l xl:border-t-0 xl:pl-5 xl:pt-0"
            aria-label="Idea properties"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Properties</h2>
              <IdeaStatusBadge status={draft.status} />
            </div>
            <Field label="Category">
              <WorkspaceSelect
                ariaLabel="Idea category"
                onValueChange={(category) =>
                  setDraft((current) => ({
                    ...current,
                    category: category as IdeaSavePayload["category"]
                  }))
                }
                options={categoryOptions}
                value={draft.category}
              />
            </Field>
            <Field label="Status">
              <WorkspaceSelect
                ariaLabel="Idea status"
                onValueChange={(status) =>
                  setDraft((current) => ({
                    ...current,
                    status: status as IdeaSavePayload["status"]
                  }))
                }
                options={statusOptions}
                value={draft.status}
              />
            </Field>
            <Field label="Assigned to">
              <Input
                aria-label="Assigned to"
                onChange={(event) =>
                  setDraft((current) => ({ ...current, assignee: event.target.value }))
                }
                placeholder="Name or email"
                value={draft.assignee}
              />
            </Field>
            <Field label="Tags">
              <div className="flex min-h-9 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {tagsFromContent(draft.content).length
                  ? tagsFromContent(draft.content).map((tag) => (
                      <span className="rounded-md bg-muted px-2 py-1 text-foreground" key={tag}>
                        #{tag}
                      </span>
                    ))
                  : "Add #tags in the content"}
              </div>
            </Field>
            {idea ? (
              <p className="text-xs text-muted-foreground">
                Created by {idea.createdBy}
                <br />
                Updated {new Date(idea.updatedAt).toLocaleString()}
              </p>
            ) : null}
          </aside>
        ) : null}
      </div>
    </WorkspacePage>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function formValues(idea: Idea | null): IdeaSavePayload {
  return idea
    ? {
        assignee: idea.assignee,
        category: idea.category,
        content: idea.content,
        status: idea.status,
        title: idea.title
      }
    : emptyIdea;
}

function tagsFromContent(content: string) {
  const text = content.replace(/<[^>]*>/gu, " ");
  return [
    ...new Set([...text.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))
  ];
}
