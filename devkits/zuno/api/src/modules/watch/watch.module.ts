import type { FastifyInstance } from "fastify";
import type { ZunoConfig } from "../diagnostics/diagnostics.types.js";
import { WatchRepository } from "./watch.repository.js";
import { registerWatchRoutes } from "./watch.routes.js";
import { WatchService } from "./watch.service.js";
import type { RawWatchSnapshot } from "./watch.types.js";

// The watch surface reads Platform summaries and logs. It has no persistence, seed, event, worker, or sync role.
export const watchModule = {
  key: "zuno.watch",
  register({
    app,
    config,
    loadSnapshot
  }: {
    app: FastifyInstance;
    config: ZunoConfig;
    loadSnapshot: () => Promise<RawWatchSnapshot>;
  }) {
    registerWatchRoutes(app, new WatchService(new WatchRepository(config), loadSnapshot));
  }
};
