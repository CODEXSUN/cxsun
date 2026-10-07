import { useQuery } from "@tanstack/react-query";
import { enquiryInScope } from "./enquiry.filters";
import {
  getEnquiry,
  getEnquiryOverviewActivity,
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

export const useEnquiries = (enabled = true) =>
  useQuery({ queryKey: enquiriesQueryKey, queryFn: listEnquiries, enabled });
export const useEnquiryOverviewActivity = () =>
  useQuery({
    queryKey: ["crm", "enquiry", "overview-activity"],
    queryFn: getEnquiryOverviewActivity
  });
export const useEnquiryContacts = () =>
  useQuery({ queryKey: enquiryContactsQueryKey, queryFn: listCoreContacts });
export const useEnquiryUsers = (enabled = true) =>
  useQuery({ queryKey: enquiryUsersQueryKey, queryFn: listTenantUsers, enabled });
export function useCrmNavigationCounts(email: string, enabled: boolean) {
  const enquiries = useEnquiries(enabled);
  const users = useEnquiryUsers(enabled);
  const userId =
    users.data?.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
  return {
    assigned: (enquiries.data ?? []).filter((record) =>
      enquiryInScope(record, "assigned", userId, email)
    ).length,
    created: (enquiries.data ?? []).filter((record) =>
      enquiryInScope(record, "created", userId, email)
    ).length,
    all: enquiries.data?.length ?? 0
  };
}
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
