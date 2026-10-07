import { crmRequest } from "../../crm-request";
import type { ContactPersonTagsInput, ContactPersonTagsRecord } from "./contact-person-tags.types";

const path = "/crm/contact-person-tags";
export const listContactPersonTags = (parentId: number) =>
  crmRequest<ContactPersonTagsRecord[]>(path + `?personId=${parentId}`);
export const saveContactPersonTags = (input: ContactPersonTagsInput, id: number | null) =>
  crmRequest<ContactPersonTagsRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactPersonTagsActive = (id: number, active: boolean) =>
  crmRequest<ContactPersonTagsRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
