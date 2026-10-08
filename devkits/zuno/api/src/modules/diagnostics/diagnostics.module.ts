import type { FastifyInstance } from "fastify";
import { DiagnosticsRepository } from "./diagnostics.repository.js";
import { DiagnosticsService } from "./diagnostics.service.js";
import { registerDiagnosticsRoutes } from "./diagnostics.routes.js";
import type { ZunoConfig } from "./diagnostics.types.js";

// This read-only capability has no database, seed, worker, event, or offline sync role.
export const diagnosticsModule = {
  key: "zuno.diagnostics",
  async register({ app, config }: { app: FastifyInstance; config: ZunoConfig }) {
    const service = new DiagnosticsService(new DiagnosticsRepository(config), config);
    registerDiagnosticsRoutes(app, service);
  }
};
