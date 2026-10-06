const superAdminRoot = "/sa/project-manager";

export function projectManagerUrl(workspace = "registry", search = ""): string {
  const normalizedWorkspace = workspace.replace(/^\/+|\/+$/gu, "") || "registry";
  const normalizedSearch = search ? (search.startsWith("?") ? search : `?${search}`) : "";

  const [page, ...children] = normalizedWorkspace.split("/");
  return `${superAdminRoot}-${page}${children.length ? `/${children.join("/")}` : ""}${normalizedSearch}`;
}

export function openProjectManagerWorkspace(workspace: string, search = "") {
  window.location.assign(projectManagerUrl(workspace, search));
}
