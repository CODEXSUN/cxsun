import { useQuery } from "@tanstack/react-query";
import { listCoreContacts, listEnquiries, listTenantUsers } from "./enquiry.services";

export const enquiriesQueryKey = ["crm", "enquiries"] as const;
export const enquiryContactsQueryKey = ["crm", "enquiry", "core-contacts"] as const;
export const enquiryUsersQueryKey = ["crm", "enquiry", "tenant-users"] as const;

export const useEnquiries = () => useQuery({ queryKey: enquiriesQueryKey, queryFn: listEnquiries });
export const useEnquiryContacts = () =>
  useQuery({ queryKey: enquiryContactsQueryKey, queryFn: listCoreContacts });
export const useEnquiryUsers = () =>
  useQuery({ queryKey: enquiryUsersQueryKey, queryFn: listTenantUsers });
