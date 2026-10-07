import { crmRequest as request } from "../../crm-request";
import type {
  EnquiryActivity,
  EnquiryAttention,
  EnquiryComment,
  EnquiryEstimate,
  EnquiryEstimateSavePayload,
  EnquiryJob,
  EnquiryJobSavePayload,
  EnquiryLookup,
  EnquiryPage,
  EnquiryPropertyPatch,
  EnquiryRecord,
  EnquirySavePayload,
  EnquirySummary,
  EnquiryReportFilters,
  EnquiryReportRow
} from "./enquiry.types";

export async function listEnquiryPage(options: {
  scope: "all" | "assigned" | "created";
  page: number;
  pageSize: number;
  search: string;
  filter: string;
  reportFilters?: EnquiryReportFilters | undefined;
}) {
  const query = new URLSearchParams({
    scope: options.scope,
    page: String(options.page),
    pageSize: String(options.pageSize),
    search: options.search,
    filter: options.filter
  });
  for (const [key, value] of Object.entries(options.reportFilters ?? {})) {
    if (value && !["filter", "fromDate", "toDate"].includes(key)) query.set(key, value);
  }
  addDateRange(query, options.reportFilters ?? {});
  return request<EnquiryPage>(`/crm/enquiries?${query}`);
}

export function listEnquiryReport(filters: EnquiryReportFilters) {
  const query = new URLSearchParams();
  addDateRange(query, filters);
  if (filters.assignedUserId) query.set("assignedUserId", filters.assignedUserId);
  return request<EnquiryReportRow[]>(`/crm/enquiries/reports?${query}`);
}

function addDateRange(query: URLSearchParams, filters: EnquiryReportFilters) {
  if (filters.fromDate) query.set("fromAt", localDateBoundary(filters.fromDate, 0));
  if (filters.toDate) query.set("toAt", localDateBoundary(filters.toDate, 1));
}

function localDateBoundary(date: string, nextDay: number) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year!, month! - 1, day! + nextDay).toISOString();
}

export const getEnquiryOverviewActivity = () =>
  request<{ commentsByYou30Days: number }>("/crm/enquiries/overview-activity");
export const getEnquiryAttention = (today: string) =>
  request<EnquiryAttention>(`/crm/enquiries/attention?today=${today}`);
export const getEnquirySummary = (today: string) =>
  request<EnquirySummary>(`/crm/enquiries/summary?today=${today}`);
export const readEnquiryAlert = (id: number) =>
  request<{ read: boolean }>(`/crm/enquiries/alerts/${id}/read`, { method: "POST" });
export const getEnquiry = (id: number) => request<EnquiryRecord>(`/crm/enquiries/${id}`);
export const listEnquiryComments = (id: number) =>
  request<EnquiryComment[]>(`/crm/enquiries/${id}/comments`);
export const createEnquiryComment = (
  id: number,
  body: string,
  parentId: number | null,
  bodyFormat: "plain" | "html" = "plain"
) =>
  request<EnquiryComment>(`/crm/enquiries/${id}/comments`, {
    method: "POST",
    body: JSON.stringify({ body, parentId, bodyFormat })
  });
export const updateEnquiryProperties = (id: number, patch: EnquiryPropertyPatch) =>
  request<EnquiryRecord>(`/crm/enquiries/${id}/properties`, {
    method: "PATCH",
    body: JSON.stringify(patch)
  });
export const openNewEnquiryCall = (id: number) =>
  request<EnquiryRecord>(`/crm/enquiries/${id}/open-new-call`, { method: "POST" });
export const listEnquiryJobs = (id: number) => request<EnquiryJob[]>(`/crm/enquiries/${id}/jobs`);
export const startEnquiryJob = (id: number) =>
  request<EnquiryJob>(`/crm/enquiries/${id}/jobs/start`, { method: "POST" });
export const stopEnquiryJob = (id: number, jobId: number) =>
  request<EnquiryJob>(`/crm/enquiries/${id}/jobs/${jobId}/stop`, { method: "POST" });
export const createEnquiryJob = (id: number, payload: EnquiryJobSavePayload) =>
  request<EnquiryJob>(`/crm/enquiries/${id}/jobs`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
export const updateEnquiryJob = (id: number, jobId: number, payload: EnquiryJobSavePayload) =>
  request<EnquiryJob>(`/crm/enquiries/${id}/jobs/${jobId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
export const listEnquiryEstimates = (id: number) =>
  request<EnquiryEstimate[]>(`/crm/enquiries/${id}/estimates`);
export const createEnquiryEstimate = (id: number, payload: EnquiryEstimateSavePayload) =>
  request<EnquiryEstimate>(`/crm/enquiries/${id}/estimates`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
export const updateEnquiryEstimate = (
  id: number,
  estimateId: number,
  payload: EnquiryEstimateSavePayload
) =>
  request<EnquiryEstimate>(`/crm/enquiries/${id}/estimates/${estimateId}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
export const listEnquiryActivity = (id: number) =>
  request<EnquiryActivity[]>(`/crm/enquiries/${id}/activity`);
export const createEnquiry = (payload: EnquirySavePayload) =>
  request<EnquiryRecord>("/crm/enquiries", { method: "POST", body: JSON.stringify(payload) });
export const updateEnquiry = (id: number, payload: EnquirySavePayload) =>
  request<EnquiryRecord>(`/crm/enquiries/${id}`, { method: "PUT", body: JSON.stringify(payload) });
export const listCoreContacts = () => request<EnquiryLookup[]>("/core/master/contacts");
export const listTenantUsers = () => request<EnquiryLookup[]>("/tenant/access/users");
