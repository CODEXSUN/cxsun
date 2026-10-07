import { crmRequest } from "../../crm-request";
import type {
  ContactRelationshipsInput,
  ContactRelationshipsRecord
} from "./contact-relationships.types";

const path = "/crm/contact-relationships";
export const listContactRelationships = (parentId: number) =>
  crmRequest<ContactRelationshipsRecord[]>(path + `?customerContactId=${parentId}`);
export const saveContactRelationships = (input: ContactRelationshipsInput, id: number | null) =>
  crmRequest<ContactRelationshipsRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactRelationshipsActive = (id: number, active: boolean) =>
  crmRequest<ContactRelationshipsRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
