import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { useEnquiryReport, useEnquiryUsers, type EnquiryReportFilters } from "../enquiry/index";
import { ReportsTable } from "./reports.table";
import type { ReportView } from "./reports.model";

const views: Array<{ id: ReportView; label: string }> = [
  { id: "list-in", label: "List in wise" },
  { id: "creator", label: "Creator wise" },
  { id: "assignee", label: "Assignee wise" },
  { id: "status", label: "Status wise" }
];

export function CrmReportsWorkspace({
  onOpenEnquiries
}: {
  onOpenEnquiries: (filters: EnquiryReportFilters) => void;
}) {
  const [view, setView] = useState<ReportView>("list-in");
  const [draft, setDraft] = useState<EnquiryReportFilters>({});
  const [filters, setFilters] = useState<EnquiryReportFilters>({});
  const report = useEnquiryReport(filters);
  const users = useEnquiryUsers();
  const invalidDates = Boolean(draft.fromDate && draft.toDate && draft.fromDate > draft.toDate);
  return (
    <WorkspacePage
      title="Enquiry reports"
      description="Select a count to open the matching enquiries. Dates use your local enquiry date."
      technicalName="page.crm.reports"
      actions={
        <Button
          type="button"
          variant="outline"
          disabled={report.isFetching}
          onClick={() => void report.refetch()}
        >
          <RefreshCw className="size-4" />
          Refresh
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2" aria-label="Enquiry report views">
          {views.map((item) => (
            <Button
              key={item.id}
              aria-pressed={view === item.id}
              type="button"
              variant={view === item.id ? "default" : "outline"}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-4">
          <label className="min-w-40 flex-1 text-sm text-muted-foreground">
            From date
            <Input
              className="mt-1"
              type="date"
              value={draft.fromDate ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, fromDate: event.target.value || undefined })
              }
            />
          </label>
          <label className="min-w-40 flex-1 text-sm text-muted-foreground">
            To date
            <Input
              className="mt-1"
              type="date"
              value={draft.toDate ?? ""}
              onChange={(event) => setDraft({ ...draft, toDate: event.target.value || undefined })}
            />
          </label>
          <div className="min-w-52 flex-[2] text-sm text-muted-foreground">
            <span>Assigned to</span>
            <div className="mt-1">
              <WorkspaceSelect
                ariaLabel="Assigned to"
                value={draft.assignedUserId ?? "all"}
                onValueChange={(value) =>
                  setDraft({ ...draft, assignedUserId: value === "all" ? undefined : value })
                }
                options={[
                  { value: "all", label: "All assignees" },
                  { value: "none", label: "Unassigned" },
                  ...(users.data ?? []).map((user) => ({
                    value: String(user.id),
                    label: user.name
                  }))
                ]}
              />
            </div>
          </div>
          <Button type="button" disabled={invalidDates} onClick={() => setFilters({ ...draft })}>
            Apply filters
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft({});
              setFilters({});
            }}
          >
            Reset
          </Button>
        </div>
        {invalidDates ? (
          <p role="alert" className="text-sm text-destructive">
            From date must be on or before To date.
          </p>
        ) : null}
        {report.error ? (
          <p role="alert" className="text-sm text-destructive">
            {report.error.message}
          </p>
        ) : null}
        <ReportsTable
          rows={report.data ?? []}
          users={users.data ?? []}
          view={view}
          filters={filters}
          loading={report.isLoading}
          onOpenEnquiries={onOpenEnquiries}
        />
      </div>
    </WorkspacePage>
  );
}
