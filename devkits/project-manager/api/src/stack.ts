export const PROJECT_MANAGER_PACKAGE_VERSION = "1.0.80";

export const projectManagerStackContribution = Object.freeze({
  applicationMode: "client" as const,
  capabilities: Object.freeze({
    api: true,
    database: true,
    web: true
  }),
  compatibility: Object.freeze({
    cxsun: "^1.0.2"
  }),
  contractVersion: 1,
  dependencies: Object.freeze([] as string[]),
  description: "Platform application and module registry.",
  displayName: "CODEXSUN Project Manager",
  id: "project-manager",
  packageId: "@cxsun/project-manager-api",
  registrationOrder: Object.freeze(["database", "api", "web"] as const),
  requiredEnvironment: Object.freeze([] as string[]),
  version: PROJECT_MANAGER_PACKAGE_VERSION
});
