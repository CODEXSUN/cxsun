import { crmRequest } from "../../crm-request";
import type { ListInInput, ListInRecord } from "./list-in.types";

const path = "/crm/list-in";
export const listListIn = () => crmRequest<ListInRecord[]>(path);
export const getListIn = (id: number) => crmRequest<ListInRecord>(path + "/" + id);
export const createListIn = (input: ListInInput) =>
  crmRequest<ListInRecord>(path, { method: "POST", body: JSON.stringify(input) });
export const updateListIn = (id: number, input: ListInInput) =>
  crmRequest<ListInRecord>(path + "/" + id, { method: "PUT", body: JSON.stringify(input) });
export const activateListIn = (id: number) =>
  crmRequest<ListInRecord>(path + "/" + id + "/activate", { method: "POST" });
export const deactivateListIn = (id: number) =>
  crmRequest<ListInRecord>(path + "/" + id + "/deactivate", { method: "POST" });
export const forceDeleteListIn = (id: number) =>
  crmRequest<ListInRecord>(path + "/" + id + "/force", { method: "DELETE" });
