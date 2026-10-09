import { formatDistanceToNow } from "date-fns";
import { Button } from "@cxsun/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@cxsun/ui/components/table";
import type { MasterBackupFile } from "./master-database.types";

export function MasterDatabaseBackups({
  files,
  loading,
  error,
  selectedRunId,
  onSelect,
  onDownload,
  downloadPending,
  downloadError,
  selectionDisabled
}: {
  files: MasterBackupFile[];
  loading: boolean;
  error: Error | null;
  selectedRunId: number | null;
  onSelect: (file: MasterBackupFile) => void;
  onDownload: (file: MasterBackupFile) => void;
  downloadPending: boolean;
  downloadError: Error | null;
  selectionDisabled: boolean;
}) {
  return (
    <section
      className="rounded-md border bg-card p-4 shadow-sm"
      aria-labelledby="master-backup-files-title"
    >
      <h2 id="master-backup-files-title" className="text-lg font-semibold">
        Master backup files
      </h2>
      <p className="text-sm text-muted-foreground">
        Download a backup, or select one for the restore card below.
      </p>
      {(error || downloadError) && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error?.message || downloadError?.message}
        </p>
      )}
      {loading && <p className="mt-4 text-sm text-muted-foreground">Loading backup files…</p>}
      {!loading && !error && files.length === 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          No completed backup files yet. Create a backup above, or upload a local SQL file below.
        </p>
      )}
      {files.length > 0 && (
        <div className="mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow
                  key={file.runId}
                  data-state={selectedRunId === file.runId ? "selected" : undefined}
                >
                  <TableCell>
                    <span className="font-medium">{file.fileName}</span>
                    <span className="block text-xs text-muted-foreground">
                      {file.source === "uploaded" ? "Uploaded" : "Generated"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}
                  </TableCell>
                  <TableCell>{formatBytes(file.sizeBytes)}</TableCell>
                  <TableCell>{file.available ? "File present" : "File missing"}</TableCell>
                  <TableCell className="space-x-2 text-right whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={!file.available || downloadPending}
                      onClick={() => onDownload(file)}
                    >
                      Download
                    </Button>
                    <Button
                      size="sm"
                      variant={selectedRunId === file.runId ? "default" : "outline"}
                      disabled={!file.available || selectionDisabled}
                      onClick={() => onSelect(file)}
                    >
                      {selectedRunId === file.runId ? "Selected" : "Select for restore"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
