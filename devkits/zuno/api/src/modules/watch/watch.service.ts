import { WatchRepository } from "./watch.repository.js";
import type { RawWatchSnapshot, WatchSnapshot, WatchTarget } from "./watch.types.js";

const maxBackupAgeMs = 36 * 60 * 60 * 1000;

export class WatchService {
  constructor(
    private readonly repository: WatchRepository,
    private readonly loadSnapshot: () => Promise<RawWatchSnapshot>
  ) {}

  async snapshot(): Promise<WatchSnapshot> {
    const now = new Date();
    const [raw, api] = await Promise.all([
      this.loadSnapshot(),
      this.repository.recentApiPerformance()
    ]);
    const queue = {
      pending: raw.queueJobs.filter((job) => job.status === "pending").length,
      failed: raw.queueJobs.filter((job) => job.status === "failed").length,
      running: raw.queueJobs.filter((job) => job.status === "running").length,
      sampleSize: raw.queueJobs.length
    };
    return {
      checkedAt: now.toISOString(),
      targets: raw.targets.map((target): WatchTarget => {
        const backups = target.runs.filter(
          (run) => run.operation === "backup" && run.status === "completed"
        );
        const latest =
          backups
            .map((run) => run.completedAt ?? run.createdAt)
            .sort((a, b) => b.localeCompare(a))[0] ?? null;
        const age = latest ? now.getTime() - new Date(latest).getTime() : null;
        return {
          scope: target.scope,
          name: target.name,
          databaseStatus: target.databaseStatus,
          backupStatus: age === null ? "missing" : age <= maxBackupAgeMs ? "fresh" : "stale",
          latestBackupAt: latest
        };
      }),
      queue,
      api
    };
  }
}
