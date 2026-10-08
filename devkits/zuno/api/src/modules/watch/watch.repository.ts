import { DiagnosticsRepository } from "../diagnostics/diagnostics.repository.js";
import type { ZunoConfig } from "../diagnostics/diagnostics.types.js";

export class WatchRepository {
  private readonly diagnostics: DiagnosticsRepository;
  constructor(config: ZunoConfig) {
    this.diagnostics = new DiagnosticsRepository(config);
  }

  async recentApiPerformance() {
    const log = await this.diagnostics.tailPlatformLog();
    const durations: number[] = [];
    let errorCount = 0;
    for (const line of log?.content.split("\n") ?? []) {
      const response = /\[response\]\s+\S+\s+\S+\s+(\d{3})\s+(\d+)ms\b/u.exec(line);
      if (!response) continue;
      const duration = Number(response[2]);
      if (!Number.isFinite(duration)) continue;
      durations.push(duration);
      if (Number(response[1]) >= 500) errorCount += 1;
    }
    durations.sort((a, b) => a - b);
    return {
      responseCount: durations.length,
      errorCount,
      p95Ms: durations.length ? durations[Math.ceil(durations.length * 0.95) - 1]! : null
    };
  }
}
