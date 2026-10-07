import type { EnquiryMasterLookup, EnquiryRecord } from "./enquiry.types";

export type EnquiryScope = "all" | "assigned" | "created";

const holdCodes = new Set([
  "hold-for-approval",
  "long-hold",
  "hold-for-spares",
  "hold-for-job-out"
]);
const closedCodes = new Set(["won", "lost"]);

export function enquiryInScope(
  record: EnquiryRecord,
  scope: EnquiryScope,
  userId: number | null,
  email: string
) {
  if (scope === "assigned") return userId !== null && record.assignedUserId === userId;
  if (scope === "created") return record.createdBy.toLowerCase() === email.toLowerCase();
  return true;
}

export function matchesEnquiryFilter(record: EnquiryRecord, filter: string) {
  const status = record.status;
  if (filter === "all") return true;
  if (filter === "active") return !closedCodes.has(status);
  if (filter === "hold") return holdCodes.has(status);
  if (filter === "in-progress")
    return (
      holdCodes.has(status) || status === "escalation" || status === "open" || status === "reopen"
    );
  if (filter === "closed-group") return closedCodes.has(status);
  if (filter === "other")
    return (
      !["new", "open", "reopen", "escalation"].includes(status) &&
      !holdCodes.has(status) &&
      !closedCodes.has(status)
    );
  return status === filter;
}

export function enquiryFilterOptions(records: EnquiryRecord[], statuses: EnquiryMasterLookup[]) {
  const options = [
    { id: "all", label: "All calls" },
    { id: "active", label: "Active (except won and lost)" },
    { id: "hold", label: "Hold" },
    { id: "other", label: "Other" },
    { id: "in-progress", label: "In progress (holds and escalation)" },
    { id: "closed-group", label: "Closed (won, lost)" },
    ...statuses
      .filter((status) => status.status === "active")
      .map((status) => ({ id: status.code ?? "", label: status.name }))
  ];
  return options
    .filter((option) => option.id)
    .map((option) => ({
      ...option,
      count: records.filter((record) => matchesEnquiryFilter(record, option.id)).length
    }));
}

export function enquiryAgeDays(record: EnquiryRecord, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(record.createdAt).getTime()) / 86_400_000));
}

export function isActiveEnquiry(record: EnquiryRecord) {
  return matchesEnquiryFilter(record, "active");
}
