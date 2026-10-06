import "@cxsun/framework/api";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import {
  bootstrapProjectManagerDatabase,
  runWithProjectManagerDatabase
} from "./database/index.js";
import type { ProjectManagerDatabase } from "./database/index.js";
import { platformRegistryModule } from "./modules/platform-registry/index.js";
import { ideasModule } from "./modules/ideas/index.js";
import { runWithProjectManagerActor, type ProjectManagerActor } from "./request-context.js";

export const projectManagerApiModuleKeys = [platformRegistryModule.key, ideasModule.key] as const;

export type ProjectManagerHostRequestContext = {
  actor: ProjectManagerActor;
  database: Kysely<ProjectManagerDatabase>;
};

export type ProjectManagerHostAdapter = {
  authorize?(input: {
    context: ProjectManagerHostRequestContext;
    request: FastifyRequest;
  }): Promise<void> | void;
  resolve(
    request: FastifyRequest
  ): Promise<ProjectManagerHostRequestContext> | ProjectManagerHostRequestContext;
};

export async function registerProjectManagerApiForHost(
  app: FastifyInstance,
  adapter: ProjectManagerHostAdapter
) {
  await app.register(
    async (projectManagerApp) => {
      const contexts = new WeakMap<FastifyRequest, ProjectManagerHostRequestContext>();
      projectManagerApp.addHook("onRequest", (request, _reply, done) => {
        void Promise.resolve(adapter.resolve(request))
          .then((context) => {
            contexts.set(request, context);
            runWithProjectManagerDatabase(context.database, () =>
              runWithProjectManagerActor(context.actor, done)
            );
          })
          .catch((error: unknown) => done(error as Error));
      });
      projectManagerApp.addHook("preHandler", async (request) => {
        const context = contexts.get(request);
        if (!context) throw new Error("Project Manager host request context is unavailable.");
        await bootstrapProjectManagerDatabase(context.database);
        await adapter.authorize?.({ context, request });
      });
      await platformRegistryModule.register({ app: projectManagerApp });
      await ideasModule.register({ app: projectManagerApp });
    },
    { prefix: "/project-manager" }
  );
}
