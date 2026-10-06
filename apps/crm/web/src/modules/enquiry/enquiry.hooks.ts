import { useQuery } from "@tanstack/react-query";
import {
  getEnquiry,
  listCoreContacts,
  listEnquiries,
  listEnquiryActivity,
  listEnquiryComments,
  listEnquiryEstimates,
  listEnquiryJobs,
  listTenantUsers
} from "./enquiry.services";

export const enquiriesQueryKey = ["crm", "enquiries"] as const;
export const enquiryContactsQueryKey = ["crm", "enquiry", "core-contacts"] as const;
export const enquiryUsersQueryKey = ["crm", "enquiry", "tenant-users"] as const;
export const enquiryDetailQueryKey = (id: number) => ["crm", "enquiry", id] as const;
export const enquiryCommentsQueryKey = (id: number) => ["crm", "enquiry", id, "comments"] as const;
export const enquiryJobsQueryKey = (id: number) => ["crm", "enquiry", id, "jobs"] as const;
export const enquiryEstimatesQueryKey = (id: number) =>
  ["crm", "enquiry", id, "estimates"] as const;
export const enquiryActivityQueryKey = (id: number) => ["crm", "enquiry", id, "activity"] as const;

export const useEnquiries = () => useQuery({ queryKey: enquiriesQueryKey, queryFn: listEnquiries });
export const useEnquiryContacts = () =>
  useQuery({ queryKey: enquiryContactsQueryKey, queryFn: listCoreContacts });
export const useEnquiryUsers = () =>
  useQuery({ queryKey: enquiryUsersQueryKey, queryFn: listTenantUsers });
export const useEnquiryDetail = (id: number) =>
  useQuery({ queryKey: enquiryDetailQueryKey(id), queryFn: () => getEnquiry(id) });
export const useEnquiryComments = (id: number) =>
  useQuery({ queryKey: enquiryCommentsQueryKey(id), queryFn: () => listEnquiryComments(id) });
export const useEnquiryJobs = (id: number) =>
  useQuery({ queryKey: enquiryJobsQueryKey(id), queryFn: () => listEnquiryJobs(id) });
export const useEnquiryEstimates = (id: number) =>
  useQuery({ queryKey: enquiryEstimatesQueryKey(id), queryFn: () => listEnquiryEstimates(id) });
export const useEnquiryActivity = (id: number) =>
  useQuery({ queryKey: enquiryActivityQueryKey(id), queryFn: () => listEnquiryActivity(id) });
