import { ArchiveIcon, LightbulbIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@cxsun/ui/workspace/table";
import type { Idea, IdeaStatus } from "./ideas.types";

export function IdeasList({
  ideas,
  onArchive,
  onOpen
}: {
  ideas: Idea[];
  onArchive: (idea: Idea) => void;
  onOpen: (idea: Idea) => void;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead>
            <tr>
              <WorkspaceTableHeaderCell>Idea</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Category</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Updated</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell className="w-20 text-right">
                Action
              </WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea) => (
              <tr
                className="border-b border-border/70 last:border-b-0 hover:bg-muted/20"
                key={idea.uuid}
              >
                <td className="px-4 py-3">
                  <button
                    className="flex min-w-0 items-start gap-3 text-left"
                    onClick={() => onOpen(idea)}
                    type="button"
                  >
                    <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <LightbulbIcon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium text-foreground">{idea.title}</span>
                      <span className="mt-0.5 block max-w-[44rem] truncate text-xs text-muted-foreground">
                        {preview(idea.content)}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{idea.category}</td>
                <td className="px-4 py-3">
                  <IdeaStatusBadge status={idea.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(idea.updatedAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  {idea.status !== "archived" ? (
                    <Button
                      aria-label={`Archive ${idea.title}`}
                      onClick={() => onArchive(idea)}
                      size="icon"
                      title="Archive idea"
                      type="button"
                      variant="ghost"
                    >
                      <ArchiveIcon />
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!ideas.length ? (
        <WorkspaceTableEmptyState>
          No ideas match the current search or filters.
        </WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

export function IdeaStatusBadge({ status }: { status: IdeaStatus }) {
  const tone =
    status === "completed"
      ? "success"
      : status === "blocked"
        ? "danger"
        : status === "in-progress"
          ? "info"
          : status === "planning"
            ? "warning"
            : "neutral";
  return <WorkspaceStatusBadge label={status.replaceAll("-", " ")} showIcon={false} tone={tone} />;
}

function preview(html: string) {
  const text = html
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return text || "No content yet";
}
