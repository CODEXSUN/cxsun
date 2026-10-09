import { useRef, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeftIcon, DownloadIcon } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@cxsun/ui/components/radio-group";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@cxsun/ui/components/alert-dialog";
import {
  useTenantBackupFilesQuery,
  useTenantBackupMutations,
  useTenantRestoreRunQuery
} from "./tenant-database.hooks";
import type { TenantBackupFile, TenantDatabaseStatus } from "./tenant-database.types";

export function TenantDatabaseBackupsWorkspace({
  record,
  onBack
}: {
  record: TenantDatabaseStatus;
  onBack: () => void;
}) {
  const files = useTenantBackupFilesQuery(record.tenantId);
  const actions = useTenantBackupMutations(record.tenantId);
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<TenantBackupFile | null>(null);
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"fresh" | "append" | null>(null);
  const [fileError, setFileError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [queuedRunId, setQueuedRunId] = useState<number | null>(null);
  const runs = record.runs.filter(
    (run) => run.operation === "backup" || run.operation === "restore"
  );
  const activeRun = runs.find(
    (run) => run.operation === "restore" && (run.status === "requested" || run.status === "running")
  );
  const trackedRun = useTenantRestoreRunQuery(
    record.tenantId,
    queuedRunId ?? activeRun?.id ?? null
  );
  const currentRun = trackedRun.data ?? activeRun;
  const restoreBusy =
    Boolean(activeRun) ||
    actions.restore.isPending ||
    Boolean(
      queuedRunId &&
      (!trackedRun.data ||
        trackedRun.data.status === "requested" ||
        trackedRun.data.status === "running")
    );

  async function upload() {
    if (!localFile) return;
    try {
      const saved = await actions.upload.mutateAsync(localFile);
      setSelected(saved);
      setLocalFile(null);
      setMode(null);
      setFileError("");
    } catch {
      // The upload error appears beside the file status.
    }
  }

  async function restore() {
    if (!selected || !mode) return;
    try {
      const run = await actions.restore.mutateAsync({
        backupRunId: selected.runId,
        sandboxMode: mode
      });
      if (run) setQueuedRunId(run.id);
    } catch {
      // The restore error appears beside the action.
    }
  }

  return (
    <WorkspacePage
      title={`${record.tenantName} Backup & Restore`}
      description={`Create, download, upload, and test backups for ${record.databaseName}. Restores use a separate sandbox.`}
      technicalName="page.database.tenant.backups"
      actions={
        <Button variant="outline" onClick={onBack}>
          <ArrowLeftIcon className="size-4" /> Tenant Database
        </Button>
      }
    >
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Create backup</h2>
            <p className="text-sm text-muted-foreground">
              Save a SQL backup of {record.databaseName}. The file appears below when the job
              completes.
            </p>
          </div>
          <Button disabled={actions.backup.isPending} onClick={() => actions.backup.mutate()}>
            <DownloadIcon className="size-4" />
            {actions.backup.isPending ? "Requesting…" : "Create backup"}
          </Button>
        </div>
        {actions.backup.isSuccess && (
          <p role="status" className="mt-3 text-sm">
            Backup queued. The file list refreshes automatically.
          </p>
        )}
        {actions.backup.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {actions.backup.error.message}
          </p>
        )}
      </section>

      <section className="rounded-md border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Tenant backup files</h2>
        <p className="text-sm text-muted-foreground">
          Files for {record.databaseName} only. Download one or select it for the restore card.
        </p>
        {files.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {files.error.message}
          </p>
        )}
        {actions.download.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {actions.download.error.message}
          </p>
        )}
        {files.isLoading && <p className="mt-3 text-sm">Loading backup files…</p>}
        {!files.isLoading && files.data?.length === 0 && (
          <p className="mt-3 text-sm text-muted-foreground">No completed backup files yet.</p>
        )}
        {Boolean(files.data?.length) && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="py-2">File</th>
                  <th className="py-2">Created</th>
                  <th className="py-2">Size</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.data?.map((file) => (
                  <tr className="border-b" key={file.runId}>
                    <td className="py-3">
                      <span className="font-medium">{file.fileName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {file.source === "uploaded" ? "Uploaded" : "Generated"}
                      </span>
                    </td>
                    <td>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</td>
                    <td>{formatBytes(file.sizeBytes)}</td>
                    <td>{file.available ? "File present" : "File missing"}</td>
                    <td className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!file.available || actions.download.isPending}
                        onClick={() => actions.download.mutate(file)}
                      >
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant={selected?.runId === file.runId ? "default" : "outline"}
                        disabled={!file.available || actions.upload.isPending}
                        onClick={() => {
                          setSelected(file);
                          setLocalFile(null);
                          setMode(null);
                          setFileError("");
                          actions.upload.reset();
                          actions.restore.reset();
                        }}
                      >
                        Select for restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-md border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Restore to sandbox</h2>
        <p className="text-sm text-muted-foreground">
          Select a stored backup above or upload a local SQL backup from this tenant. Upload and
          validation must finish before restore starts.
        </p>
        <div className="mt-4 space-y-3 border-t pt-4">
          <h3 className="font-medium">1. Select a backup file</h3>
          <input
            ref={fileInput}
            type="file"
            accept=".sql"
            className="hidden"
            aria-label="Choose local SQL backup"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              if (
                !file.name.toLowerCase().endsWith(".sql") ||
                file.size === 0 ||
                file.size > 100 * 1024 * 1024
              ) {
                setFileError("Choose a non-empty .sql backup file no larger than 100 MB.");
                return;
              }
              setFileError("");
              setLocalFile(file);
              setSelected(null);
              setMode(null);
              actions.upload.reset();
              actions.restore.reset();
            }}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={actions.upload.isPending}
              onClick={() => fileInput.current?.click()}
            >
              Choose local SQL file
            </Button>
            {localFile && (
              <Button disabled={actions.upload.isPending} onClick={() => void upload()}>
                {actions.upload.isPending ? "Uploading…" : "Upload selected file"}
              </Button>
            )}
          </div>
          <p role="status" className="text-sm">
            {actions.upload.isPending
              ? `Uploading ${localFile?.name}…`
              : localFile
                ? `${localFile.name} selected — not uploaded yet.`
                : selected
                  ? `${selected.fileName} ${selected.source === "uploaded" ? "uploaded and checked" : "stored on server"} — ready for mode selection.`
                  : "No restore file selected."}
          </p>
          {(fileError || actions.upload.error) && (
            <p role="alert" className="text-sm text-destructive">
              {fileError || actions.upload.error?.message}
            </p>
          )}
        </div>
        <div className="mt-4 space-y-3 border-t pt-4">
          <h3 className="font-medium">2. Choose how to restore</h3>
          <RadioGroup
            value={mode || ""}
            onValueChange={(value) => setMode(value as "fresh" | "append")}
            disabled={!selected || Boolean(localFile)}
            className="grid gap-3 md:grid-cols-2"
          >
            <label
              htmlFor="tenant-restore-fresh"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
            >
              <RadioGroupItem id="tenant-restore-fresh" value="fresh" className="mt-1" />
              <span>
                <span className="block font-medium">Fresh restore</span>
                <span className="block text-sm text-muted-foreground">
                  Replace the sandbox database with this backup.
                </span>
              </span>
            </label>
            <label
              htmlFor="tenant-restore-append"
              className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
            >
              <RadioGroupItem
                id="tenant-restore-append"
                value="append"
                disabled={!record.restoreSandboxExists}
                className="mt-1"
              />
              <span>
                <span className="block font-medium">Append rows</span>
                <span className="block text-sm text-muted-foreground">
                  Keep sandbox data and insert backup rows. Duplicate keys roll back the append.
                  {!record.restoreSandboxExists ? " Run Fresh restore first." : ""}
                </span>
              </span>
            </label>
          </RadioGroup>
          <p className="text-sm text-muted-foreground">
            Target: {record.restoreDatabaseName}. The live tenant database is never the target.
          </p>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <p className="text-sm text-muted-foreground">
            {restoreBusy
              ? "A restore is queued or running. Wait for it to finish."
              : "Review the file and mode before starting the job."}
          </p>
          <Button
            disabled={
              !selected?.available ||
              !mode ||
              Boolean(localFile) ||
              restoreBusy ||
              (mode === "append" && !record.restoreSandboxExists)
            }
            onClick={() => setConfirmOpen(true)}
          >
            Review restore
          </Button>
        </div>
        {actions.restore.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {actions.restore.error.message}
          </p>
        )}
        {trackedRun.error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {trackedRun.error.message}
          </p>
        )}
        {currentRun && (
          <p role="status" className="mt-3 text-sm">
            {currentRun.status === "failed"
              ? `Restore failed: ${String(currentRun.details.error || "Check recent jobs.")}`
              : currentRun.status === "completed"
                ? `Restore completed in ${String(currentRun.details.restoredDatabaseName || record.restoreDatabaseName)}.`
                : `Restore ${currentRun.status}. This page updates automatically.`}
          </p>
        )}
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {mode === "fresh"
                  ? "Replace the tenant sandbox?"
                  : "Append rows to the tenant sandbox?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                File: {selected?.fileName}. Target: {record.restoreDatabaseName}.{" "}
                {mode === "fresh"
                  ? "Existing sandbox tables and data will be removed."
                  : "Existing sandbox data stays. Duplicate key or schema errors roll back inserted rows."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void restore()}>
                Queue {mode === "fresh" ? "fresh" : "append"} restore
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Recent backup and restore jobs</h2>
        {runs.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No backup or restore jobs yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b text-left">
                <tr>
                  <th className="py-2">Job</th>
                  <th className="py-2">Status</th>
                  <th className="py-2">When</th>
                  <th className="py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr className="border-b" key={run.uuid}>
                    <td className="py-3 capitalize">{run.operation}</td>
                    <td className="capitalize">{run.status}</td>
                    <td>{formatDistanceToNow(new Date(run.createdAt), { addSuffix: true })}</td>
                    <td>
                      {typeof run.details.error === "string"
                        ? run.details.error
                        : typeof run.details.restoredDatabaseName === "string"
                          ? run.details.restoredDatabaseName
                          : typeof run.details.backupId === "string"
                            ? run.details.backupId
                            : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </WorkspacePage>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
