import "@cxsun/framework/api";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { diagnosticsModule, type ZunoConfig } from "./modules/diagnostics/index.js";

export const zunoApiModuleKeys = [diagnosticsModule.key] as const;

export async function registerZunoApi(
  app: FastifyInstance,
  options: {
    authorize(request: FastifyRequest): Promise<void> | void;
    config: ZunoConfig;
  }
) {
  await app.register(
    async (zuno) => {
      zuno.addHook("preHandler", options.authorize);
      await diagnosticsModule.register({ app: zuno, config: options.config });
    },
    { prefix: "/zuno" }
  );
}
