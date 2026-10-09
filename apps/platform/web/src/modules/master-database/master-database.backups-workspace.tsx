import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { MasterDatabaseBackups } from "./master-database.backups";
import { MasterDatabaseRestore, type SandboxMode } from "./master-database.restore";
import {
  useMasterBackupFilesQuery,
  useMasterDatabaseMutations,
  useMasterDatabaseQuery
} from "./master-database.hooks";
import type { DatabaseMaintenanceRun, MasterBackupFile } from "./master-database.types";

export function MasterDatabaseBackupsWorkspace({ onBack }: { onBack: () => void }) {
  const status = useMasterDatabaseQuery(5_000);
  const files = useMasterBackupFilesQuery();
  const mutations = useMasterDatabaseMutations();
  const [selected, setSelected] = useState<MasterBackupFile | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [mode, setMode] = useState<SandboxMode | null>(null);
  const maintenanceRuns =
    status.data?.runs.filter((run) => run.operation === "backup" || run.operation === "restore") ??
    [];

  return (
    <WorkspacePage
      title="Master Backup & Restore"
      description="Create, download, upload, and restore master database backups. Restores run in a sandbox."
      technicalName="page.database.master.backups"
      actions={
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="size-4" />
          Master Database
        </Button>
      }
    >
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Create backup</h2>
            <p className="text-sm text-muted-foreground">
              Save a new SQL backup of {status.data?.databaseName || "the master database"}. The
              file will appear below when the job completes.
            </p>
          </div>
          <Button disabled={mutations.backup.isPending} onClick={() => mutations.backup.mutate()}>
            <DownloadIcon className="size-4" />
            {mutations.backup.isPending ? "Requesting…" : "Create backup"}
          </Button>
        </div>
        {mutations.backup.isSuccess && (
          <p className="mt-3 text-sm text-muted-foreground" role="status">
            Backup queued. The file list refreshes automatically.
          </p>
        )}
        {mutations.backup.error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {mutations.backup.error.message}
          </p>
        )}
      </section>
      <MasterDatabaseBackups
        files={files.data ?? []}
        loading={files.isLoading}
        error={files.error}
        selectedRunId={selected?.runId ?? null}
        onSelect={(file) => {
          setSelected(file);
          setLocalFile(null);
          setMode(null);
          mutations.upload.reset();
          mutations.restore.reset();
          document.getElementById("master-restore-card")?.scrollIntoView({ behavior: "smooth" });
        }}
        onDownload={(file) => mutations.download.mutate(file)}
        downloadPending={mutations.download.isPending}
        downloadError={mutations.download.error}
        selectionDisabled={mutations.upload.isPending}
      />
      <MasterDatabaseRestore
        selected={selected}
        localFile={localFile}
        mode={mode}
        sandboxName={
          status.data?.restoreStatus === "sandbox-configured"
            ? status.data.restoreDatabaseName
            : null
        }
        sandboxExists={status.data?.restoreSandboxExists ?? false}
        runs={maintenanceRuns}
        actions={mutations}
        onChooseLocal={(file) => {
          setLocalFile(file);
          setSelected(null);
          setMode(null);
          mutations.upload.reset();
          mutations.restore.reset();
        }}
        onUploaded={(file) => {
          setSelected(file);
          setLocalFile(null);
          setMode(null);
        }}
        onModeChange={setMode}
      />
      <BackupRunHistory runs={maintenanceRuns} loading={status.isLoading} error={status.error} />
    </WorkspacePage>
  );
}

function BackupRunHistory({
  runs,
  loading,
  error
}: {
  runs: DatabaseMaintenanceRun[];
  loading: boolean;
  error: Error | null;
}) {
  return (
    <section
      className="rounded-md border bg-card p-4 shadow-sm"
      aria-labelledby="backup-run-history-title"
    >
      <h2 id="backup-run-history-title" className="text-lg font-semibold">
        Recent backup and restore jobs
      </h2>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error.message}
        </p>
      )}
      {loading && <p className="mt-3 text-sm text-muted-foreground">Loading recent jobs…</p>}
      {!loading && !error && runs.length === 0 && (
        <p className="mt-3 text-sm text-muted-foreground">No backup or restore jobs yet.</p>
      )}
      {runs.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-muted-foreground">
              <tr>
                <th className="py-2 pr-4">Job</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">When</th>
                <th className="py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr className="border-b last:border-0" key={run.uuid}>
                  <td className="py-3 pr-4 capitalize">{run.operation}</td>
                  <td className="py-3 pr-4 capitalize">{run.status}</td>
                  <td className="py-3 pr-4">
                    {run.completedAt
                      ? formatDistanceToNow(new Date(run.completedAt), { addSuffix: true })
                      : "Pending"}
                  </td>
                  <td className="py-3 text-muted-foreground">{runResult(run)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function runResult(run: DatabaseMaintenanceRun) {
  if (typeof run.details.error === "string") return run.details.error;
  if (run.operation === "restore" && typeof run.details.restoredDatabaseName === "string") {
    return run.details.sandboxMode === "append"
      ? `Append: ${Number(run.details.insertedRows || 0)} rows added to ${run.details.restoredDatabaseName}`
      : `${run.details.sandboxMode === "fresh" ? "Fresh" : "Sandbox"}: ${run.details.restoredDatabaseName}`;
  }
  if (run.operation === "backup" && typeof run.details.backupId === "string") {
    return `Backup: ${run.details.backupId}`;
  }
  return "—";
}
