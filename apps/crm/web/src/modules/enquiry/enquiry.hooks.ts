import { useQuery } from "@tanstack/react-query";
import {
  getEnquiry,
  getEnquiryOverviewActivity,
  getEnquiryAttention,
  getEnquirySummary,
  listCoreContacts,
  listEnquiryPage,
  listEnquiryReport,
  listEnquiryActivity,
  listEnquiryComments,
  listEnquiryEstimates,
  listEnquiryJobs,
  listTenantUsers
} from "./enquiry.services";
import type { EnquiryReportFilters } from "./enquiry.types";

export const enquiriesQueryKey = ["crm", "enquiries"] as const;
export const enquiryAttentionQueryKey = ["crm", "enquiries", "attention"] as const;
export const enquirySummaryQueryKey = ["crm", "enquiries", "summary"] as const;
export const enquiryReportQueryKey = ["crm", "enquiries", "reports"] as const;
export const enquiryContactsQueryKey = ["crm", "enquiry", "core-contacts"] as const;
export const enquiryUsersQueryKey = ["crm", "enquiry", "tenant-users"] as const;
export const enquiryDetailQueryKey = (id: number) => ["crm", "enquiry", id] as const;
export const enquiryCommentsQueryKey = (id: number) => ["crm", "enquiry", id, "comments"] as const;
export const enquiryJobsQueryKey = (id: number) => ["crm", "enquiry", id, "jobs"] as const;
export const enquiryEstimatesQueryKey = (id: number) =>
  ["crm", "enquiry", id, "estimates"] as const;
export const enquiryActivityQueryKey = (id: number) => ["crm", "enquiry", id, "activity"] as const;

export const useEnquirySummary = (enabled = true) =>
  useQuery({
    queryKey: enquirySummaryQueryKey,
    queryFn: () => getEnquirySummary(localToday()),
    enabled
  });
export const useEnquiryPage = (options: {
  scope: "all" | "assigned" | "created";
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  reportFilters?: EnquiryReportFilters | undefined;
}) =>
  useQuery({
    queryKey: [
      ...enquiriesQueryKey,
      "page",
      options.scope,
      options.page,
      options.pageSize,
      options.search,
      options.filter,
      options.reportFilters
    ],
    queryFn: () => listEnquiryPage(options)
  });
export const useEnquiryReport = (filters: EnquiryReportFilters) =>
  useQuery({
    queryKey: [...enquiryReportQueryKey, filters.fromDate, filters.toDate, filters.assignedUserId],
    queryFn: () => listEnquiryReport(filters)
  });
export const useEnquiryOverviewActivity = () =>
  useQuery({
    queryKey: ["crm", "enquiry", "overview-activity"],
    queryFn: getEnquiryOverviewActivity
  });
export const useEnquiryAttention = (enabled = true) =>
  useQuery({
    queryKey: enquiryAttentionQueryKey,
    queryFn: () => getEnquiryAttention(localToday()),
    enabled,
    refetchInterval: 60_000
  });

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export const useEnquiryContacts = (enabled = true) =>
  useQuery({ queryKey: enquiryContactsQueryKey, queryFn: listCoreContacts, enabled });
export const useEnquiryUsers = (enabled = true) =>
  useQuery({ queryKey: enquiryUsersQueryKey, queryFn: listTenantUsers, enabled });
export function useCrmNavigationCounts(_email: string, enabled: boolean) {
  const summary = useEnquirySummary(enabled);
  return {
    assigned: summary.data?.assigned.total ?? 0,
    created: summary.data?.created.total ?? 0,
    all: summary.data?.allCount ?? 0
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
