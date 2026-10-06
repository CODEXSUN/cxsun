import { crmRequest as request } from "../../crm-request";
import type {
  EnquiryActivity,
  EnquiryComment,
  EnquiryEstimate,
  EnquiryEstimateSavePayload,
  EnquiryJob,
  EnquiryJobSavePayload,
  EnquiryLookup,
  EnquiryPropertyPatch,
  EnquiryRecord,
  EnquirySavePayload
} from "./enquiry.types";

export const listEnquiries = () => request<EnquiryRecord[]>("/crm/enquiries");
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
