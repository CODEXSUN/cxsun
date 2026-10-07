import { useMemo, useState, useDeferredValue, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { useListIn } from "../list-in/index";
import { useStatus } from "../status/index";
import { usePriority } from "../priority/index";
import { EnquiryForm } from "./enquiry.form";
import {
  enquiriesQueryKey,
  enquiryDetailQueryKey,
  enquiryCommentsQueryKey,
  enquiryActivityQueryKey,
  enquiryAttentionQueryKey,
  enquiryContactsQueryKey,
  useEnquiryPage,
  useEnquiryContacts,
  useEnquiryUsers
} from "./enquiry.hooks";
import { EnquiryList } from "./enquiry.list";
import { EnquiryAttention } from "./enquiry.attention";
import { EnquiryShow } from "./enquiry.show";
import { createEnquiry, openNewEnquiryCall, updateEnquiry } from "./enquiry.services";
import { enquiryFilterOptions, type EnquiryScope } from "./enquiry.filters";
import type { EnquiryRecord, EnquiryReportFilters, EnquirySavePayload } from "./enquiry.types";

const columnOptions = [
  { id: "customer", label: "Customer" },
  { id: "details", label: "Enquiry details" },
  { id: "listIn", label: "List in" },
  { id: "dueDate", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "creator", label: "Creator" },
  { id: "assignedTo", label: "Assigned to" },
  { id: "status", label: "Status" }
];

export function EnquiryWorkspace({
  scope = "all",
  reportFilters,
  onBackToReports,
  initialCreate = false,
  onCloseCreate
}: {
  scope?: EnquiryScope;
  reportFilters?: EnquiryReportFilters | undefined;
  onBackToReports?: () => void;
  currentUserEmail?: string;
  initialCreate?: boolean;
  onCloseCreate?: () => void;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EnquiryRecord | null | undefined>(
    initialCreate ? null : undefined
  );
  const [showing, setShowing] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(
    reportFilters?.filter ?? (scope === "assigned" ? "active" : "all")
  );
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const deferredSearch = useDeferredValue(search);
  const query = useEnquiryPage({
    scope,
    page,
    pageSize: rowsPerPage,
    search: deferredSearch.trim(),
    filter: status,
    reportFilters
  });
  const contacts = useEnquiryContacts(editing !== undefined || showing !== null);
  const users = useEnquiryUsers();
  const lists = useListIn();
  const statuses = useStatus();
  const priorities = usePriority();
  const filterOptions = useMemo(
    () => enquiryFilterOptions(query.data?.statusCounts ?? [], statuses.data ?? []),
    [query.data?.statusCounts, statuses.data]
  );
  const reportContext = reportFilters
    ? [
        reportFilters.fromDate && `From ${reportFilters.fromDate}`,
        reportFilters.toDate && `To ${reportFilters.toDate}`,
        reportFilters.listInId &&
          `List in: ${reportFilters.listInId === "none" ? "(no group)" : ((lists.data ?? []).find((item) => String(item.id) === reportFilters.listInId)?.name ?? reportFilters.listInId)}`,
        reportFilters.createdBy && `Creator: ${reportFilters.createdBy}`,
        reportFilters.assignedUserId &&
          `Assignee: ${reportFilters.assignedUserId === "none" ? "Unassigned" : ((users.data ?? []).find((item) => String(item.id) === reportFilters.assignedUserId)?.name ?? reportFilters.assignedUserId)}`,
        status !== "all" &&
          `Status: ${filterOptions.find((item) => item.id === status)?.label ?? status}`
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const openCall = useMutation({
    mutationFn: (record: EnquiryRecord) => openNewEnquiryCall(record.id),
    onSuccess: async (record) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: enquiriesQueryKey }),
        client.invalidateQueries({ queryKey: enquiryDetailQueryKey(record.id) }),
        client.invalidateQueries({ queryKey: enquiryCommentsQueryKey(record.id) }),
        client.invalidateQueries({ queryKey: enquiryActivityQueryKey(record.id) }),
        client.invalidateQueries({ queryKey: enquiryAttentionQueryKey })
      ]);
      toast.success(`Call #${record.enquiryNo} opened`);
    },
    onError: (error) => toast.error("Unable to open new call", { description: error.message })
  });
  const save = useMutation({
    mutationFn: (payload: EnquirySavePayload) =>
      editing ? updateEnquiry(editing.id, payload) : createEnquiry(payload),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: enquiriesQueryKey });
      await client.invalidateQueries({ queryKey: enquiryDetailQueryKey(record.id) });
      await client.invalidateQueries({ queryKey: enquiryContactsQueryKey });
      await client.invalidateQueries({ queryKey: enquiryAttentionQueryKey });
      toast.success(`Enquiry #${record.enquiryNo} ${editing ? "updated" : "created"}`, {
        description: record.title
      });
      setEditing(undefined);
      if (initialCreate) onCloseCreate?.();
    },
    onError: (error) => toast.error("Unable to save enquiry", { description: error.message })
  });
  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = query.data?.items ?? [];
  useEffect(() => {
    if (query.data && page > totalPages) setPage(totalPages);
  }, [query.data, page, totalPages]);
  if (editing !== undefined) {
    return (
      <EnquiryForm
        key={editing?.id ?? "new"}
        record={editing}
        contacts={contacts.data ?? []}
        contactsLoading={contacts.isLoading}
        listOptions={lists.data ?? []}
        statuses={statuses.data ?? []}
        priorities={priorities.data ?? []}
        users={users.data ?? []}
        loading={save.isPending}
        error={save.error?.message ?? ""}
        lookupError={
          contacts.error?.message ??
          users.error?.message ??
          lists.error?.message ??
          statuses.error?.message ??
          priorities.error?.message ??
          ""
        }
        onBack={() => {
          setEditing(undefined);
          if (initialCreate) onCloseCreate?.();
        }}
        onContactSaved={async () => {
          await Promise.all([
            client.invalidateQueries({ queryKey: enquiryContactsQueryKey }),
            client.invalidateQueries({ queryKey: enquiriesQueryKey })
          ]);
        }}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  }
  if (showing !== null) {
    return (
      <EnquiryShow
        id={showing}
        contacts={contacts.data ?? []}
        users={users.data ?? []}
        listOptions={lists.data ?? []}
        statuses={statuses.data ?? []}
        priorities={priorities.data ?? []}
      />
    );
  }
  return (
    <WorkspacePage
      title={scope === "assigned" ? "My Job" : scope === "created" ? "My Calls" : "All Enquiries"}
      description={
        scope === "assigned"
          ? "Enquiries assigned to your user account."
          : scope === "created"
            ? "Enquiries created by you."
            : "Capture and qualify customer requests."
      }
      technicalName={`page.crm.${scope}.enquiries.list`}
      actions={
        scope === "assigned" ? undefined : (
          <Button
            type="button"
            disabled={
              lists.isLoading ||
              statuses.isLoading ||
              priorities.isLoading ||
              Boolean(statuses.error || priorities.error)
            }
            onClick={() => setEditing(null)}
          >
            <Plus className="size-4" />
            New enquiry
          </Button>
        )
      }
    >
      {reportFilters ? (
        <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-4 py-2 text-sm">
          <span>Report results{reportContext ? ` · ${reportContext}` : ""}</span>
          <Button type="button" variant="outline" onClick={onBackToReports}>
            Back to reports
          </Button>
        </div>
      ) : null}
      {scope === "assigned" ? <EnquiryAttention onOpen={setShowing} /> : null}
      <WorkspaceFilters
        columnOptions={columnOptions
          .filter(
            (column) =>
              (column.id !== "creator" || scope !== "created") &&
              (column.id !== "assignedTo" || scope !== "assigned")
          )
          .map((column) => ({
            ...column,
            label:
              column.id === "assignedTo" && scope === "created" ? "Allocated to" : column.label,
            checked: visibleColumns[column.id] !== false,
            onCheckedChange: (checked) =>
              setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
          }))}
        onShowAllColumns={() => setVisibleColumns({})}
        searchPlaceholder="Search ID, details, phone, or customer"
        searchValue={search}
        onSearchValueChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        filterValue={status}
        showSelectedFilterChip
        onFilterValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        filterOptions={filterOptions}
      />
      {query.error ? (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}
        </p>
      ) : null}
      <EnquiryList
        records={records}
        users={users.data ?? []}
        userColumnMode={
          scope === "assigned" ? "creator" : scope === "created" ? "allocatedTo" : "both"
        }
        visibleColumns={visibleColumns}
        loading={query.isLoading}
        onShow={(record) => setShowing(record.id)}
        onEdit={setEditing}
        onOpenCall={(record) => openCall.mutate(record)}
        openingCallId={openCall.isPending ? openCall.variables.id : null}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        rowsPerPageOptions={[20, 50, 100]}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, total)}
        singularLabel="enquiry"
        totalCount={total}
        totalPages={totalPages}
        onNextPage={() => setPage((value) => Math.min(totalPages, value + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
        onRowsPerPageChange={(value) => {
          setRowsPerPage(value);
          setPage(1);
        }}
      />
    </WorkspacePage>
  );
}
