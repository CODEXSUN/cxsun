export type RawBackupRun = {
  operation: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
};

export type RawWatchTarget = {
  scope: "master" | "tenant";
  name: string;
  databaseStatus: "online" | "offline";
  runs: RawBackupRun[];
};

export type RawWatchSnapshot = {
  targets: RawWatchTarget[];
  queueJobs: Array<{ status: string; createdAt: string }>;
};

export type WatchTarget = {
  scope: "master" | "tenant";
  name: string;
  databaseStatus: "online" | "offline";
  backupStatus: "fresh" | "stale" | "missing";
  latestBackupAt: string | null;
};

export type WatchSnapshot = {
  checkedAt: string;
  targets: WatchTarget[];
  queue: { pending: number; failed: number; running: number; sampleSize: number };
  api: { responseCount: number; errorCount: number; p95Ms: number | null };
};
