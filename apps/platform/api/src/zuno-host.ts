import type { FastifyInstance, FastifyRequest } from "fastify";
import { registerZunoApi } from "@cxsun/zuno-api";
import { AppError } from "@cxsun/framework/errors";
import { env } from "./env.js";

export async function registerZunoHost(app: FastifyInstance) {
  await registerZunoApi(app, {
    authorize(request: FastifyRequest) {
      if (request.authContext?.payload?.userType !== "super_admin") {
        throw AppError.forbidden("Zuno is available only to Super Admin.");
      }
      if (request.method === "POST") {
        request.log.info(
          {
            action: "zuno.investigate",
            actorId: request.authContext.payload.userId
          },
          "Zuno investigation requested"
        );
      }
    },
    config: {
      sourceRoot: env.CXSUN_ZUNO_SOURCE_ROOT,
      platformLogPath: env.CXSUN_ZUNO_PLATFORM_LOG_PATH,
      providerBaseUrl: env.CXSUN_ZUNO_PROVIDER_BASE_URL,
      providerModel: env.CXSUN_ZUNO_PROVIDER_MODEL,
      providerApiKey: env.CXSUN_ZUNO_PROVIDER_API_KEY
    }
  });
}
