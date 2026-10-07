import type { EnquiryLookup, EnquiryReportFilters, EnquiryReportRow } from "../enquiry/index";
export type ReportView = "list-in" | "creator" | "assignee" | "status";

type Group = { key: string; label: string; counts: Map<string, number>; total: number };

export function reportDrilldown(
  view: ReportView,
  key: string,
  filters: EnquiryReportFilters,
  status?: string
): EnquiryReportFilters {
  const next: EnquiryReportFilters = { ...filters, filter: status ?? "all" };
  if (view === "list-in") next.listInId = key;
  if (view === "creator") next.createdBy = key;
  if (view === "assignee") next.assignedUserId = key;
  if (view === "status") next.filter = key;
  return next;
}

export function groupRows(
  rows: EnquiryReportRow[],
  view: ReportView,
  users: EnquiryLookup[]
): Group[] {
  const byId = new Map(users.map((user) => [String(user.id), user.name]));
  const byEmail = new Map(
    users.filter((user) => user.email).map((user) => [user.email!.toLowerCase(), user.name])
  );
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const key =
      view === "list-in"
        ? String(row.listInId ?? "none")
        : view === "creator"
          ? row.createdBy
          : view === "assignee"
            ? String(row.assignedUserId ?? "none")
            : row.status;
    const label =
      view === "list-in"
        ? (row.listIn ?? "(no group)")
        : view === "creator"
          ? (byEmail.get(row.createdBy.toLowerCase()) ?? row.createdBy)
          : view === "assignee"
            ? (byId.get(key) ?? (key === "none" ? "Unassigned" : `User #${key}`))
            : row.statusName;
    const group = groups.get(key) ?? { key, label, counts: new Map<string, number>(), total: 0 };
    const bucket = statusBucket(row.status);
    group.counts.set(bucket, (group.counts.get(bucket) ?? 0) + row.count);
    group.total += row.count;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => a.label.localeCompare(b.label));
}

function statusBucket(status: string) {
  if (status === "new") return "new";
  if (["open", "reopen", "escalation"].includes(status)) return "pending-group";
  if (["hold-for-approval", "long-hold", "hold-for-spares", "hold-for-job-out"].includes(status))
    return "hold";
  if (["won", "lost", "closed"].includes(status)) return "closed-group";
  return "other";
}
