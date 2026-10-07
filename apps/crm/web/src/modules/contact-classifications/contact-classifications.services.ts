import { crmRequest } from "../../crm-request";
import type {
  ContactClassificationsInput,
  ContactClassificationsRecord
} from "./contact-classifications.types";

const path = "/crm/contact-classifications";
export const listContactClassifications = (parentId: number) =>
  crmRequest<ContactClassificationsRecord[]>(path + `?personId=${parentId}`);
export const saveContactClassifications = (input: ContactClassificationsInput, id: number | null) =>
  crmRequest<ContactClassificationsRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactClassificationsActive = (id: number, active: boolean) =>
  crmRequest<ContactClassificationsRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
