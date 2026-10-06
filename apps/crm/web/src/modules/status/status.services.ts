import { crmRequest } from "../../crm-request";
import type { StatusInput, StatusRecord } from "./status.types";

const path = "/crm/statuses";
export const listStatus = () => crmRequest<StatusRecord[]>(path);
export const getStatus = (id: number) => crmRequest<StatusRecord>(path + "/" + id);
export const createStatus = (input: StatusInput) =>
  crmRequest<StatusRecord>(path, { method: "POST", body: JSON.stringify(input) });
export const updateStatus = (id: number, input: StatusInput) =>
  crmRequest<StatusRecord>(path + "/" + id, { method: "PUT", body: JSON.stringify(input) });
export const activateStatus = (id: number) =>
  crmRequest<StatusRecord>(path + "/" + id + "/activate", { method: "POST" });
export const deactivateStatus = (id: number) =>
  crmRequest<StatusRecord>(path + "/" + id + "/deactivate", { method: "POST" });
export const forceDeleteStatus = (id: number) =>
  crmRequest<StatusRecord>(path + "/" + id + "/force", { method: "DELETE" });
