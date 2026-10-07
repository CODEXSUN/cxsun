import { crmRequest } from "../../crm-request";
import type { ContactRolesInput, ContactRolesRecord } from "./contact-roles.types";

const path = "/crm/contact-roles";
export const listContactRoles = (parentId: number) =>
  crmRequest<ContactRolesRecord[]>(path + `?personId=${parentId}`);
export const saveContactRoles = (input: ContactRolesInput, id: number | null) =>
  crmRequest<ContactRolesRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactRolesActive = (id: number, active: boolean) =>
  crmRequest<ContactRolesRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
