import {
  WorkspaceTableEmptyState,
  WorkspaceTableLoadingState,
  WorkspaceTablePanel
} from "@cxsun/ui/workspace/table";
import type { EnquiryLookup, EnquiryReportFilters, EnquiryReportRow } from "../enquiry/index";
import { groupRows, reportDrilldown, type ReportView } from "./reports.model";

const buckets = [
  { label: "New", filter: "new" },
  { label: "Pending", filter: "pending-group" },
  { label: "Hold", filter: "hold" },
  { label: "Closed", filter: "closed-group" },
  { label: "Other", filter: "other" }
] as const;

export function ReportsTable({
  rows,
  users,
  view,
  filters,
  loading,
  onOpenEnquiries
}: {
  rows: EnquiryReportRow[];
  users: EnquiryLookup[];
  view: ReportView;
  filters: EnquiryReportFilters;
  loading: boolean;
  onOpenEnquiries: (filters: EnquiryReportFilters) => void;
}) {
  const groups = groupRows(rows, view, users);
  const open = (key: string, status?: string) =>
    onOpenEnquiries(reportDrilldown(view, key, filters, status));
  return (
    <WorkspaceTablePanel>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="border-b px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                {view === "list-in"
                  ? "List in"
                  : view === "creator"
                    ? "Creator"
                    : view === "assignee"
                      ? "Assignee"
                      : "Status"}
              </th>
              {view !== "status"
                ? buckets.map((bucket) => (
                    <th
                      className="border-b px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground"
                      key={bucket.filter}
                    >
                      {bucket.label}
                    </th>
                  ))
                : null}
              <th className="border-b px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr className="border-b last:border-b-0 hover:bg-muted/20" key={group.key}>
                <th className="px-4 py-3 text-left font-medium">{group.label}</th>
                {view !== "status"
                  ? buckets.map((bucket) => {
                      const count = group.counts.get(bucket.filter) ?? 0;
                      return (
                        <td className="px-4 py-3 text-right" key={bucket.filter}>
                          {count ? (
                            <button
                              className="cursor-pointer font-medium text-primary hover:underline"
                              type="button"
                              onClick={() => open(group.key, bucket.filter)}
                              aria-label={`Open ${count} ${bucket.label} enquiries for ${group.label}`}
                            >
                              {count}
                            </button>
                          ) : (
                            "—"
                          )}
                        </td>
                      );
                    })
                  : null}
                <td className="px-4 py-3 text-right">
                  <button
                    className="cursor-pointer font-semibold text-primary hover:underline"
                    type="button"
                    onClick={() => open(group.key)}
                    aria-label={`Open ${group.total} enquiries for ${group.label}`}
                  >
                    {group.total}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!groups.length && loading ? <WorkspaceTableLoadingState /> : null}
      {!groups.length && !loading ? (
        <WorkspaceTableEmptyState>No enquiries match these filters.</WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}
