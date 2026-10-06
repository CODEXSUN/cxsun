import { apiGet, apiPost, apiPut } from "../../shared/api/project-manager-api";
import type { Idea, IdeaSavePayload } from "./ideas.types";

const path = "/admin/ideas";

export function listIdeas() {
  return apiGet<Idea[]>(path);
}

export function createIdea(input: IdeaSavePayload) {
  return apiPost<Idea>(path, input);
}

export function updateIdea(uuid: string, input: IdeaSavePayload) {
  return apiPut<Idea>(`${path}/${uuid}`, input);
}

export function archiveIdea(uuid: string) {
  return apiPost<Idea>(`${path}/${uuid}/archive`);
}
