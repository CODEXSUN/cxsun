import { crmRequest } from "../../crm-request";
import type { PriorityInput, PriorityRecord } from "./priority.types";

const path = "/crm/priorities";
export const listPriority = () => crmRequest<PriorityRecord[]>(path);
export const getPriority = (id: number) => crmRequest<PriorityRecord>(path + "/" + id);
export const createPriority = (input: PriorityInput) =>
  crmRequest<PriorityRecord>(path, { method: "POST", body: JSON.stringify(input) });
export const updatePriority = (id: number, input: PriorityInput) =>
  crmRequest<PriorityRecord>(path + "/" + id, { method: "PUT", body: JSON.stringify(input) });
export const activatePriority = (id: number) =>
  crmRequest<PriorityRecord>(path + "/" + id + "/activate", { method: "POST" });
export const deactivatePriority = (id: number) =>
  crmRequest<PriorityRecord>(path + "/" + id + "/deactivate", { method: "POST" });
export const forceDeletePriority = (id: number) =>
  crmRequest<PriorityRecord>(path + "/" + id + "/force", { method: "DELETE" });
