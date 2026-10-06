import { defineModule } from "@cxsun/framework/modules";
import type { ProjectManagerModuleDependencies } from "../../module-dependencies.js";
import { registerIdeasRoutes } from "./ideas.routes.js";

export const ideasModule = defineModule<ProjectManagerModuleDependencies>({
  key: "project-manager.ideas",
  label: "Ideas",
  register({ app }) {
    return registerIdeasRoutes(app);
  }
});
