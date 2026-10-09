import { apiGet, apiPost } from "../../shared/api/platform-api";
import { requiredClientEnv } from "../../shared/env/client-env";
import type {
  DatabaseActionPayload,
  DatabaseMaintenanceRun,
  MasterBackupFile,
  MasterDatabaseStatus
} from "./master-database.types";

export function getMasterDatabaseStatus() {
  return apiGet<MasterDatabaseStatus>("/admin/database/master", "sa");
}

export function migrateMasterDatabase(payload: DatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>("/admin/database/master/migrate", payload, "sa");
}

export function requestMasterDatabaseBackup(payload: DatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>("/admin/database/master/backup", payload, "sa");
}

export function getMasterBackupFiles() {
  return apiGet<MasterBackupFile[]>("/admin/database/master/backups", "sa");
}

export function requestMasterDatabaseRestore(input: {
  backupRunId: number;
  sandboxMode: "fresh" | "append";
}) {
  return apiPost<DatabaseMaintenanceRun>("/admin/database/master/restore", input, "sa");
}

export function getMasterRestoreRun(runId: number) {
  return apiGet<DatabaseMaintenanceRun>(`/admin/database/master/restores/${runId}`, "sa");
}

export async function uploadMasterBackup(file: File) {
  const response = await fetch(
    `${requiredClientEnv("VITE_PLATFORM_API_URL")}/admin/database/master/backups/upload`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/vnd.cxsun.database-backup",
        "x-auth-desk": "sa",
        "x-cxsun-filename": encodeURIComponent(file.name)
      },
      body: file
    }
  );
  const result = (await response.json()) as {
    data?: MasterBackupFile;
    error?: { message: string };
  };
  if (!response.ok || !result.data) throw new Error(result.error?.message || "Upload failed.");
  return result.data;
}

export async function downloadMasterBackup(file: MasterBackupFile) {
  const response = await fetch(
    `${requiredClientEnv("VITE_PLATFORM_API_URL")}/admin/database/master/backups/${file.runId}/download`,
    {
      credentials: "include",
      headers: { "x-auth-desk": "sa" }
    }
  );
  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as {
      error?: { message: string };
    } | null;
    throw new Error(result?.error?.message || "Download failed.");
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = file.fileName;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
