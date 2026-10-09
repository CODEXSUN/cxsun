import { useEffect, useRef, useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@cxsun/ui/components/radio-group";
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
import type { DatabaseMaintenanceRun, MasterBackupFile } from "./master-database.types";
import { useMasterRestoreRunQuery } from "./master-database.hooks";

export type SandboxMode = "fresh" | "append";

type RestoreActions = {
  upload: {
    isPending: boolean;
    error: Error | null;
    mutateAsync: (file: File) => Promise<MasterBackupFile>;
  };
  restore: {
    isPending: boolean;
    error: Error | null;
    mutateAsync: (input: {
      backupRunId: number;
      sandboxMode: SandboxMode;
    }) => Promise<DatabaseMaintenanceRun>;
  };
};

export function MasterDatabaseRestore({
  selected,
  localFile,
  mode,
  sandboxName,
  sandboxExists,
  runs,
  actions,
  onChooseLocal,
  onUploaded,
  onModeChange
}: {
  selected: MasterBackupFile | null;
  localFile: File | null;
  mode: SandboxMode | null;
  sandboxName: string | null;
  sandboxExists: boolean;
  runs: DatabaseMaintenanceRun[];
  actions: RestoreActions;
  onChooseLocal: (file: File | null) => void;
  onUploaded: (file: MasterBackupFile) => void;
  onModeChange: (mode: SandboxMode) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [queuedRunId, setQueuedRunId] = useState<number | null>(null);
  const trackedRunId =
    queuedRunId ??
    runs.find(
      (run) =>
        run.operation === "restore" && (run.status === "requested" || run.status === "running")
    )?.id ??
    null;
  const trackedRun = useMasterRestoreRunQuery(trackedRunId);
  const queuedRun = trackedRun.data ?? runs.find((run) => run.id === trackedRunId);
  const activeRestore =
    runs.some(
      (run) =>
        run.operation === "restore" && (run.status === "requested" || run.status === "running")
    ) ||
    Boolean(
      queuedRunId &&
      (!queuedRun || queuedRun.status === "requested" || queuedRun.status === "running")
    );
  const ready = Boolean(
    selected?.available &&
    mode &&
    sandboxName &&
    !activeRestore &&
    (mode !== "append" || sandboxExists)
  );

  useEffect(() => {
    setQueuedRunId(null);
  }, [selected?.runId]);

  async function uploadSelectedFile() {
    if (!localFile) return;
    try {
      const uploaded = await actions.upload.mutateAsync(localFile);
      onUploaded(uploaded);
    } catch {
      // The mutation error is shown below the file picker.
    }
  }

  async function queueRestore() {
    if (!selected || !mode) return;
    try {
      const run = await actions.restore.mutateAsync({
        backupRunId: selected.runId,
        sandboxMode: mode
      });
      setQueuedRunId(run.id);
    } catch {
      // The mutation error is shown below the restore action.
    }
  }

  return (
    <section
      id="master-restore-card"
      className="scroll-mt-6 rounded-md border bg-card p-4 shadow-sm"
      aria-labelledby="master-restore-title"
    >
      <h2 id="master-restore-title" className="text-lg font-semibold">
        Restore to sandbox
      </h2>
      <p className="text-sm text-muted-foreground">
        Choose a stored backup above or select a local SQL file. Upload and validation must finish
        before restore can start.
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
              onChooseLocal(null);
              return;
            }
            setFileError("");
            onChooseLocal(file);
          }}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            disabled={actions.upload.isPending}
            onClick={() => fileInput.current?.click()}
          >
            Choose local SQL file
          </Button>
          {localFile && (
            <Button disabled={actions.upload.isPending} onClick={() => void uploadSelectedFile()}>
              {actions.upload.isPending ? "Uploading…" : "Upload selected file"}
            </Button>
          )}
        </div>
        <p className="text-sm" role="status">
          {actions.upload.isPending
            ? `Uploading ${localFile?.name || "file"}…`
            : localFile
              ? `${localFile.name} selected — not uploaded yet.`
              : selected
                ? `${selected.fileName} ${selected.source === "uploaded" ? "uploaded and format checked" : "stored on server"} — ready for mode selection.`
                : "No restore file selected."}
        </p>
        {((!selected && fileError) || actions.upload.error) && (
          <p role="alert" className="text-sm text-destructive">
            {(!selected && fileError) || actions.upload.error?.message}
          </p>
        )}
      </div>

      <div className="mt-4 space-y-3 border-t pt-4">
        <h3 className="font-medium">2. Choose how to restore</h3>
        <RadioGroup
          value={mode || ""}
          onValueChange={(value) => onModeChange(value as SandboxMode)}
          disabled={!selected || Boolean(localFile)}
          className="grid gap-3 md:grid-cols-2"
        >
          <label
            htmlFor="restore-fresh"
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
          >
            <RadioGroupItem id="restore-fresh" value="fresh" className="mt-1" />
            <span>
              <span className="block font-medium">Fresh restore</span>
              <span className="block text-sm text-muted-foreground">
                Replace the sandbox database with this backup. Existing sandbox data is removed.
              </span>
            </span>
          </label>
          <label
            htmlFor="restore-append"
            className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
          >
            <RadioGroupItem
              id="restore-append"
              value="append"
              className="mt-1"
              disabled={!sandboxExists}
            />
            <span>
              <span className="block font-medium">Append rows</span>
              <span className="block text-sm text-muted-foreground">
                Keep sandbox data and insert backup rows. Duplicate keys or schema conflicts roll
                back the append.{!sandboxExists ? " Run Fresh restore first." : ""}
              </span>
            </span>
          </label>
        </RadioGroup>
        <p className="text-sm text-muted-foreground">
          Target: {sandboxName || "Sandbox is not configured"}. The live master database is never
          the target.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <div className="text-sm text-muted-foreground">
          {activeRestore
            ? "A restore is already queued or running. Wait for it to finish."
            : "Review the file and mode before starting the job."}
        </div>
        <Button disabled={!ready || actions.restore.isPending} onClick={() => setConfirmOpen(true)}>
          Review restore
        </Button>
      </div>
      {actions.restore.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {actions.restore.error.message}
        </p>
      )}
      {trackedRunId && (
        <p role="status" className="mt-3 text-sm">
          {restoreProgress(queuedRun)}
        </p>
      )}
      {trackedRun.error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {trackedRun.error.message}
        </p>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {mode === "fresh" ? "Replace the sandbox database?" : "Append rows to the sandbox?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              File: {selected?.fileName}. Target: {sandboxName}.{" "}
              {mode === "fresh"
                ? "All current sandbox tables and data will be removed before this backup is restored."
                : "Existing sandbox data stays. Any duplicate key or schema error rolls back the inserted rows."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void queueRestore()}>
              Queue {mode === "fresh" ? "fresh" : "append"} restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function restoreProgress(run: DatabaseMaintenanceRun | undefined) {
  if (!run || run.status === "requested") return "Restore queued. Waiting for the database worker…";
  if (run.status === "running") return "Restore running. This page updates automatically.";
  if (run.status === "failed")
    return `Restore failed: ${String(run.details.error || "Check recent jobs below.")}`;
  if (run.details.sandboxMode === "append") {
    return `Append completed: ${Number(run.details.insertedRows || 0)} rows added to ${String(run.details.restoredDatabaseName || "the sandbox")}.`;
  }
  return `Fresh restore completed in ${String(run.details.restoredDatabaseName || "the sandbox")}.`;
}
