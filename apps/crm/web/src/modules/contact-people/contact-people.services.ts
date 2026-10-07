import { crmRequest } from "../../crm-request";
import type { ContactPeopleInput, ContactPeopleRecord } from "./contact-people.types";

const path = "/crm/contact-people";
export const listContactPeople = (parentId: number) =>
  crmRequest<ContactPeopleRecord[]>(path + `?customerContactId=${parentId}`);
export const saveContactPeople = (input: ContactPeopleInput, id: number | null) =>
  crmRequest<ContactPeopleRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactPeopleActive = (id: number, active: boolean) =>
  crmRequest<ContactPeopleRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
