import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import {
  registerProjectManagerApiForHost,
  type ProjectManagerDatabase,
  type ProjectManagerHostAdapter,
  type ProjectManagerHostRequestContext
} from "@cxsun/project-manager-api";
import { AppError } from "@cxsun/framework/errors";
import { getPlatformDatabase } from "./database/platform-database.js";
import type { PlatformDatabase } from "./database/schema.js";

export const projectManagerHostAdapter: ProjectManagerHostAdapter = {
  async authorize({ context }) {
    if (context.actor.roles.includes("super_admin")) return;
    throw AppError.forbidden("Project Manager is available only to Super Admin.");
  },
  async resolve(request) {
    return resolveProjectManagerContext(request);
  }
};

export async function registerProjectManagerHost(
  app: Parameters<typeof registerProjectManagerApiForHost>[0]
) {
  await registerProjectManagerApiForHost(app, projectManagerHostAdapter);
}

async function resolveProjectManagerContext(
  request: FastifyRequest
): Promise<ProjectManagerHostRequestContext> {
  const payload = request.authContext?.payload;
  if (payload?.userType === "super_admin") {
    return {
      actor: {
        email: payload.email,
        id: payload.userId,
        permissions: ["project-manager.access"],
        roles: ["super_admin"],
        storageScope: "master"
      },
      database: projectManagerDatabase(getPlatformDatabase())
    };
  }
  throw AppError.forbidden("Project Manager is available only to Super Admin.");
}

function projectManagerDatabase(
  database: Kysely<PlatformDatabase>
): Kysely<ProjectManagerDatabase> {
  return database as unknown as Kysely<ProjectManagerDatabase>;
}
