import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@cxsun/ui/workspace/table";
import type { WatchSnapshot } from "./watch.types.js";

export function WatchTargetsList({ targets }: { targets: WatchSnapshot["targets"] }) {
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr>
              <WorkspaceTableHeaderCell>Database</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Connection</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Backup</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Latest completed backup</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {targets.map((target) => (
              <tr
                key={`${target.scope}-${target.name}`}
                className="border-b border-border/70 last:border-b-0"
              >
                <td className="px-4 py-3">
                  <span className="font-medium">{target.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{target.scope}</span>
                </td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={target.databaseStatus}
                    tone={target.databaseStatus === "online" ? "success" : "danger"}
                    showIcon={false}
                  />
                </td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge
                    label={target.backupStatus}
                    tone={
                      target.backupStatus === "fresh"
                        ? "success"
                        : target.backupStatus === "stale"
                          ? "warning"
                          : "danger"
                    }
                    showIcon={false}
                  />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {target.latestBackupAt
                    ? new Date(target.latestBackupAt).toLocaleString()
                    : "No completed run"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {targets.length === 0 ? (
        <WorkspaceTableEmptyState>No database targets are available.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
