import { crmRequest } from "../../crm-request";
import type { ContactTagsInput, ContactTagsRecord } from "./contact-tags.types";

const path = "/crm/contact-tags";
export const listContactTags = (_parentId: number) => crmRequest<ContactTagsRecord[]>(path + "");
export const saveContactTags = (input: ContactTagsInput, id: number | null) =>
  crmRequest<ContactTagsRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactTagsActive = (id: number, active: boolean) =>
  crmRequest<ContactTagsRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
