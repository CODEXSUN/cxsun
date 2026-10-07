import { crmRequest } from "../../crm-request";
import type {
  ContactCommunicationInput,
  ContactCommunicationRecord
} from "./contact-communication.types";

const path = "/crm/contact-communication";
export const listContactCommunication = (parentId: number) =>
  crmRequest<ContactCommunicationRecord[]>(path + `?personId=${parentId}`);
export const saveContactCommunication = (input: ContactCommunicationInput, id: number | null) =>
  crmRequest<ContactCommunicationRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactCommunicationActive = (id: number, active: boolean) =>
  crmRequest<ContactCommunicationRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
