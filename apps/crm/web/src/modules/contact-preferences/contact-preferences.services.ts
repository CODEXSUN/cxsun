import { crmRequest } from "../../crm-request";
import type {
  ContactPreferencesInput,
  ContactPreferencesRecord
} from "./contact-preferences.types";

const path = "/crm/contact-preferences";
export const listContactPreferences = (parentId: number) =>
  crmRequest<ContactPreferencesRecord[]>(path + `?personId=${parentId}`);
export const saveContactPreferences = (input: ContactPreferencesInput, id: number | null) =>
  crmRequest<ContactPreferencesRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactPreferencesActive = (id: number, active: boolean) =>
  crmRequest<ContactPreferencesRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
