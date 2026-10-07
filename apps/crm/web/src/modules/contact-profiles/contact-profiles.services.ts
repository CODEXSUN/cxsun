import { crmRequest } from "../../crm-request";
import type { ContactProfilesInput, ContactProfilesRecord } from "./contact-profiles.types";

const path = "/crm/contact-profiles";
export const listContactProfiles = (parentId: number) =>
  crmRequest<ContactProfilesRecord[]>(path + `?coreContactId=${parentId}`);
export const saveContactProfiles = (input: ContactProfilesInput, id: number | null) =>
  crmRequest<ContactProfilesRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactProfilesActive = (id: number, active: boolean) =>
  crmRequest<ContactProfilesRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
