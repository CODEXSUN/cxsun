import { crmRequest } from "../../crm-request";
import type { ContactLifecycleInput, ContactLifecycleRecord } from "./contact-lifecycle.types";

const path = "/crm/contact-lifecycle";
export const listContactLifecycle = (parentId: number) =>
  crmRequest<ContactLifecycleRecord[]>(path + `?personId=${parentId}`);
export const saveContactLifecycle = (input: ContactLifecycleInput, id: number | null) =>
  crmRequest<ContactLifecycleRecord>(path + (id ? `/${id}` : ""), {
    method: id ? "PUT" : "POST",
    body: JSON.stringify(input)
  });
export const setContactLifecycleActive = (id: number, active: boolean) =>
  crmRequest<ContactLifecycleRecord>(`${path}/${id}/${active ? "activate" : "deactivate"}`, {
    method: "POST"
  });
