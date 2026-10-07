import { crmRequest } from "../../crm-request";
import type {
  ContactEmploymentsInput,
  ContactEmploymentsRecord
} from "./contact-employments.types";

const path = "/crm/contact-employments";
export const listContactEmployments = (parentId: number) =>
  crmRequest<ContactEmploymentsRecord[]>(path + `?personId=${parentId}`);
export const saveContactEmployments = (input: ContactEmploymentsInput, id: number | null) =>
  crmRequest<ContactEmploymentsRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactEmploymentsActive = (id: number, active: boolean) =>
  crmRequest<ContactEmploymentsRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
