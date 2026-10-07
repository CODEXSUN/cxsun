import type { EnquiryMasterLookup, EnquiryRecord } from "./enquiry.types";

export type EnquiryScope = "all" | "assigned" | "created";

const holdCodes = new Set([
  "hold-for-approval",
  "long-hold",
  "hold-for-spares",
  "hold-for-job-out"
]);
const closedCodes = new Set(["won", "lost", "closed"]);

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
  return matchesStatusFilter(record.status, filter);
}

function matchesStatusFilter(status: string, filter: string) {
  if (filter === "all") return true;
  if (filter === "active") return !closedCodes.has(status);
  if (filter === "hold") return holdCodes.has(status);
  if (filter === "pending-group") return ["open", "reopen", "escalation"].includes(status);
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

export function countEnquiryStatuses(
  counts: Array<{ code: string; count: number }>,
  filter: string
) {
  return counts.reduce(
    (total, item) => total + (matchesStatusFilter(item.code, filter) ? item.count : 0),
    0
  );
}

export function enquiryFilterOptions(
  counts: Array<{ code: string; count: number }>,
  statuses: EnquiryMasterLookup[]
) {
  const options = [
    { id: "all", label: "All calls" },
    { id: "active", label: "Active (except won and lost)" },
    { id: "hold", label: "Hold" },
    { id: "pending-group", label: "Pending" },
    { id: "other", label: "Other" },
    { id: "in-progress", label: "In progress (holds and escalation)" },
    { id: "closed-group", label: "Closed (won, lost, closed)" },
    ...statuses
      .filter((status) => status.status === "active")
      .map((status) => ({ id: status.code ?? "", label: status.name }))
  ];
  return options
    .filter((option) => option.id)
    .map((option) => ({
      ...option,
      count: countEnquiryStatuses(counts, option.id)
    }));
}

export function enquiryAgeDays(record: EnquiryRecord, now = Date.now()) {
  return Math.max(0, Math.floor((now - new Date(record.createdAt).getTime()) / 86_400_000));
}

export function isActiveEnquiry(record: EnquiryRecord) {
  return matchesEnquiryFilter(record, "active");
}
