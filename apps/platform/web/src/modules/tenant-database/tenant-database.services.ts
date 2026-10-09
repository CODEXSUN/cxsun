import { apiGet, apiPost } from "../../shared/api/platform-api";
import { requiredClientEnv } from "../../shared/env/client-env";
import type {
  DatabaseMaintenanceRun,
  TenantDatabaseActionPayload,
  TenantDatabaseDetails,
  TenantDatabaseStatus,
  TenantBackupFile
} from "./tenant-database.types";

export function listTenantDatabaseStatus() {
  return apiGet<TenantDatabaseStatus[]>("/admin/database/tenants", "sa");
}

export function getTenantDatabaseDetails(tenantId: number) {
  return apiGet<TenantDatabaseDetails>(`/admin/database/tenants/${tenantId}/details`, "sa");
}

export function migrateTenantDatabase(tenantId: number, payload: TenantDatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/migrate`,
    payload,
    "sa"
  );
}

export function setupTenantDatabase(tenantId: number, payload: TenantDatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/setup`,
    payload,
    "sa"
  );
}

export function reinstallTenantDatabase(tenantId: number, payload: TenantDatabaseActionPayload) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/reinstall`,
    payload,
    "sa"
  );
}

export function requestTenantDatabaseBackup(
  tenantId: number,
  payload: TenantDatabaseActionPayload
) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/backup`,
    payload,
    "sa"
  );
}

export function requestTenantDatabaseRestore(
  tenantId: number,
  payload: { backupRunId: number; sandboxMode: "fresh" | "append" }
) {
  return apiPost<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/restore`,
    payload,
    "sa"
  );
}

export function getTenantBackupFiles(tenantId: number) {
  return apiGet<TenantBackupFile[]>(`/admin/database/tenants/${tenantId}/backups`, "sa");
}

export function getTenantRestoreRun(tenantId: number, runId: number) {
  return apiGet<DatabaseMaintenanceRun>(
    `/admin/database/tenants/${tenantId}/restores/${runId}`,
    "sa"
  );
}

export async function uploadTenantBackup(tenantId: number, file: File) {
  const response = await fetch(
    `${requiredClientEnv("VITE_PLATFORM_API_URL")}/admin/database/tenants/${tenantId}/backups/upload`,
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
    data?: TenantBackupFile;
    error?: { message: string };
  };
  if (!response.ok || !result.data) throw new Error(result.error?.message || "Upload failed.");
  return result.data;
}

export async function downloadTenantBackup(tenantId: number, file: TenantBackupFile) {
  const response = await fetch(
    `${requiredClientEnv("VITE_PLATFORM_API_URL")}/admin/database/tenants/${tenantId}/backups/${file.runId}/download`,
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
