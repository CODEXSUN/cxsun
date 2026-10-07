import { crmRequest } from "../../crm-request";
import type { ContactNotesInput, ContactNotesRecord } from "./contact-notes.types";

const path = "/crm/contact-notes";
export const listContactNotes = (parentId: number) =>
  crmRequest<ContactNotesRecord[]>(path + `?personId=${parentId}`);
export const saveContactNotes = (input: ContactNotesInput, id: number | null) =>
  crmRequest<ContactNotesRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactNotesActive = (id: number, active: boolean) =>
  crmRequest<ContactNotesRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
