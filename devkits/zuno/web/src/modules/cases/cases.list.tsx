import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@cxsun/ui/workspace/table";
import type { ZunoCase } from "./cases.types.js";

export function CasesList({
  cases,
  onOpen
}: {
  cases: ZunoCase[];
  onOpen(record: ZunoCase): void;
}) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <WorkspaceTableHeaderCell>Case</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Type</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Severity</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Updated</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {cases.map((record) => (
              <tr
                key={record.uuid}
                className="border-b border-border/70 last:border-b-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-left font-medium text-primary hover:underline"
                    onClick={() => onOpen(record)}
                  >
                    {record.title}
                  </button>
                  <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                    {record.description}
                  </p>
                </td>
                <td className="px-4 py-3 capitalize">{record.kind.replaceAll("_", " ")}</td>
                <td className="px-4 py-3 capitalize">{record.severity}</td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={record.status.replaceAll("_", " ")}
                    showIcon={false}
                    tone={statusTone(record.status)}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(record.updatedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cases.length === 0 ? (
        <WorkspaceTableEmptyState>No Zuno cases yet.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function statusTone(status: ZunoCase["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "approved") return "info" as const;
  if (status === "proposal_ready") return "warning" as const;
  return "neutral" as const;
}
