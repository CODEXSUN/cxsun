import { defineModule } from "@cxsun/framework/modules";
import type { ProjectManagerModuleDependencies } from "../../module-dependencies.js";
import { registerPlatformRegistryRoutes } from "./platform-registry.routes.js";

export const platformRegistryModule = defineModule<ProjectManagerModuleDependencies>({
  key: "project-manager.platform-registry",
  label: "Platform Registry",
  register({ app }) {
    return registerPlatformRegistryRoutes(app);
  }
});
