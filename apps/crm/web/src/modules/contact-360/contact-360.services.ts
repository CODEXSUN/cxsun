import { crmRequest } from "../../crm-request";
import type { Contact360Customer } from "./contact-360.types";

export const listContact360Customers = () =>
  crmRequest<Contact360Customer[]>("/core/master/contacts");
