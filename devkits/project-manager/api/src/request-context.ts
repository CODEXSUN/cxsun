import { AsyncLocalStorage } from "node:async_hooks";

export type ProjectManagerActor = {
  email?: string;
  id: string;
  permissions: readonly string[];
  roles: readonly string[];
  storageScope: string;
};

const actorContext = new AsyncLocalStorage<ProjectManagerActor>();

export function runWithProjectManagerActor<T>(actor: ProjectManagerActor, callback: () => T) {
  return actorContext.run(actor, callback);
}

export function requireProjectManagerActor() {
  const actor = actorContext.getStore();
  if (!actor) throw new Error("Project Manager requires a CXSUN-provided actor.");
  return actor;
}
