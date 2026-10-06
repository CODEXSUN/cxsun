import { useMemo, useState } from "react";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { IdeasForm } from "./ideas.form";
import { IdeasList } from "./ideas.list";
import { useIdeasMutations, useIdeasQuery } from "./ideas.hooks";
import type { Idea, IdeaSavePayload } from "./ideas.types";

const categoryFilters = [
  { id: "all", label: "All categories" },
  { id: "general", label: "General" },
  { id: "product", label: "Product" },
  { id: "engineering", label: "Engineering" },
  { id: "design", label: "Design" },
  { id: "research", label: "Research" }
];

export function IdeasWorkspace() {
  const query = useIdeasQuery();
  const mutations = useIdeasMutations();
  const [editing, setEditing] = useState<Idea | null | "new">(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState("");
  const ideas = useMemo(
    () =>
      (query.data ?? []).filter(
        (idea) =>
          (showArchived || idea.status !== "archived") &&
          (category === "all" || idea.category === category) &&
          matches(idea, search)
      ),
    [category, query.data, search, showArchived]
  );

  async function save(input: IdeaSavePayload) {
    if (editing && editing !== "new")
      await mutations.update.mutateAsync({ input, uuid: editing.uuid });
    else await mutations.create.mutateAsync(input);
    toast.success(editing === "new" ? "Idea created" : "Idea updated");
    setEditing(null);
  }

  async function archive(idea: Idea) {
    if (!window.confirm(`Archive “${idea.title}”?`)) return;
    setError("");
    try {
      await mutations.archive.mutateAsync(idea.uuid);
      toast.success("Idea archived");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The idea could not be archived.");
    }
  }

  if (editing) {
    return (
      <IdeasForm
        idea={editing === "new" ? null : editing}
        onBack={() => setEditing(null)}
        onSave={save}
        saving={mutations.create.isPending || mutations.update.isPending}
      />
    );
  }

  return (
    <WorkspacePage
      title="Ideas"
      description="Capture proposals and turn rough thinking into clear work."
      actions={
        <Button onClick={() => setEditing("new")} type="button">
          <PlusIcon /> New idea
        </Button>
      }
    >
      <WorkspaceFilters
        filterOptions={categoryFilters}
        filterValue={category}
        onFilterValueChange={setCategory}
        onSearchValueChange={setSearch}
        searchPlaceholder="Search ideas"
        searchValue={search}
        toolbarAction={
          <Button
            onClick={() => setShowArchived((value) => !value)}
            size="sm"
            type="button"
            variant="outline"
          >
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
        }
      />
      {error || query.error ? (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          {error ||
            (query.error instanceof Error ? query.error.message : "Ideas could not be loaded.")}
        </div>
      ) : null}
      {query.isLoading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading ideas…</div>
      ) : (
        <IdeasList ideas={ideas} onArchive={(idea) => void archive(idea)} onOpen={setEditing} />
      )}
      <p className="text-xs text-muted-foreground">
        {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
      </p>
    </WorkspacePage>
  );
}

function matches(idea: Idea, search: string) {
  const needle = search.trim().toLowerCase();
  return (
    !needle ||
    [idea.title, idea.content, idea.assignee].some((value) => value.toLowerCase().includes(needle))
  );
}
