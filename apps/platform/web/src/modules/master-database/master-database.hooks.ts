import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { maintenanceNote } from "./master-database.schema";
import {
  downloadMasterBackup,
  getMasterBackupFiles,
  getMasterDatabaseStatus,
  getMasterRestoreRun,
  migrateMasterDatabase,
  requestMasterDatabaseBackup,
  requestMasterDatabaseRestore,
  uploadMasterBackup
} from "./master-database.services";
import type { MasterBackupFile } from "./master-database.types";

export const masterDatabaseQueryKey = ["admin", "database", "master"] as const;
export const masterBackupFilesQueryKey = [...masterDatabaseQueryKey, "backups"] as const;

export function useMasterBackupFilesQuery() {
  return useQuery({
    queryFn: getMasterBackupFiles,
    queryKey: masterBackupFilesQueryKey,
    refetchInterval: 15_000
  });
}

export function useMasterDatabaseQuery(refetchInterval = 15_000) {
  return useQuery({
    queryFn: getMasterDatabaseStatus,
    queryKey: masterDatabaseQueryKey,
    refetchInterval
  });
}

export function useMasterRestoreRunQuery(runId: number | null) {
  return useQuery({
    enabled: runId !== null,
    queryFn: () => {
      if (runId === null) throw new Error("Restore job ID is required.");
      return getMasterRestoreRun(runId);
    },
    queryKey: [...masterDatabaseQueryKey, "restores", runId],
    refetchInterval: (query) =>
      query.state.data?.status === "completed" || query.state.data?.status === "failed"
        ? false
        : 2_000
  });
}

export function useMasterDatabaseMutations() {
  const client = useQueryClient();
  const done = () => client.invalidateQueries({ queryKey: masterDatabaseQueryKey });
  return {
    backup: useMutation({
      mutationFn: () => requestMasterDatabaseBackup(maintenanceNote("Master backup")),
      onSuccess: done
    }),
    migrate: useMutation({
      mutationFn: () => migrateMasterDatabase(maintenanceNote("Master migration")),
      onSuccess: done
    }),
    restore: useMutation({
      mutationFn: (input: { backupRunId: number; sandboxMode: "fresh" | "append" }) =>
        requestMasterDatabaseRestore(input),
      onSuccess: done
    }),
    upload: useMutation({ mutationFn: uploadMasterBackup, onSuccess: done }),
    download: useMutation({ mutationFn: (file: MasterBackupFile) => downloadMasterBackup(file) })
  };
}
