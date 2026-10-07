import { useQuery } from "@tanstack/react-query";
import { listContact360Customers } from "./contact-360.services";

export const useContact360Customers = () =>
  useQuery({ queryKey: ["crm", "contact-360", "customers"], queryFn: listContact360Customers });
