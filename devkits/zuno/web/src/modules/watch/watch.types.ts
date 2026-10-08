export type WatchSnapshot = {
  checkedAt: string;
  targets: Array<{
    scope: "master" | "tenant";
    name: string;
    databaseStatus: "online" | "offline";
    backupStatus: "fresh" | "stale" | "missing";
    latestBackupAt: string | null;
  }>;
  queue: { pending: number; failed: number; running: number; sampleSize: number };
  api: { responseCount: number; errorCount: number; p95Ms: number | null };
};
