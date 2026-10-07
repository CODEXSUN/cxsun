import { crmRequest } from "../../crm-request";
import type { ContactDocumentsInput, ContactDocumentsRecord } from "./contact-documents.types";

const path = "/crm/contact-documents";
export const listContactDocuments = (parentId: number) =>
  crmRequest<ContactDocumentsRecord[]>(path + `?personId=${parentId}`);
export const saveContactDocuments = (input: ContactDocumentsInput, id: number | null) =>
  crmRequest<ContactDocumentsRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactDocumentsActive = (id: number, active: boolean) =>
  crmRequest<ContactDocumentsRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
