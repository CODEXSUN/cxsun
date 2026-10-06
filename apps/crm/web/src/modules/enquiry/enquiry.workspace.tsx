import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { EnquiryForm } from "./enquiry.form";
import {
  enquiriesQueryKey,
  enquiryContactsQueryKey,
  useEnquiries,
  useEnquiryContacts,
  useEnquiryUsers
} from "./enquiry.hooks";
import { EnquiryList } from "./enquiry.list";
import { createEnquiry, updateEnquiry } from "./enquiry.services";
import type { EnquiryRecord, EnquirySavePayload, EnquiryStatus } from "./enquiry.types";

const columnOptions = [
  { id: "customer", label: "Customer" },
  { id: "details", label: "Enquiry details" },
  { id: "listIn", label: "List in" },
  { id: "dueDate", label: "Due date" },
  { id: "priority", label: "Priority" },
  { id: "user", label: "User" },
  { id: "status", label: "Status" }
];

export function EnquiryWorkspace() {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EnquiryRecord | null | undefined>(undefined);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const query = useEnquiries();
  const contacts = useEnquiryContacts();
  const users = useEnquiryUsers();
  const listOptions = useMemo(
    () => Array.from(new Set((query.data ?? []).map((record) => record.listIn).filter(isPresent))),
    [query.data]
  );
  const save = useMutation({
    mutationFn: (payload: EnquirySavePayload) =>
      editing ? updateEnquiry(editing.id, payload) : createEnquiry(payload),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: enquiriesQueryKey });
      await client.invalidateQueries({ queryKey: enquiryContactsQueryKey });
      toast.success(`Enquiry #${record.enquiryNo} ${editing ? "updated" : "created"}`, {
        description: record.title
      });
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save enquiry", { description: error.message })
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          [
            String(record.enquiryNo),
            `#${record.enquiryNo}`,
            record.title,
            record.description,
            record.capturedName,
            record.contactName,
            record.capturedPhone,
            record.capturedEmail
          ].some((field) => field?.toLowerCase().includes(term)))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  if (editing !== undefined) {
    return (
      <EnquiryForm
        key={editing?.id ?? "new"}
        record={editing}
        contacts={contacts.data ?? []}
        contactsLoading={contacts.isLoading}
        listOptions={listOptions}
        users={users.data ?? []}
        loading={save.isPending}
        error={save.error?.message ?? ""}
        lookupError={contacts.error?.message ?? users.error?.message ?? ""}
        onBack={() => setEditing(undefined)}
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
  return (
    <WorkspacePage
      title="Enquiries"
      description="Capture and qualify customer requests."
      technicalName="page.crm.enquiries.list"
      actions={
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button type="button" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New enquiry
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        columnOptions={columnOptions.map((column) => ({
          ...column,
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
        onFilterValueChange={(value) => {
          setStatus(value);
          setPage(1);
        }}
        filterOptions={[
          { id: "all", label: "All statuses" },
          ...(["new", "contacted", "qualified", "unqualified"] as EnquiryStatus[]).map((id) => ({
            id,
            label: id[0]!.toUpperCase() + id.slice(1)
          }))
        ]}
      />
      {query.error ? (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}
        </p>
      ) : null}
      <EnquiryList
        records={records}
        users={users.data ?? []}
        visibleColumns={visibleColumns}
        loading={query.isLoading}
        onEdit={setEditing}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filtered.length)}
        singularLabel="enquiry"
        totalCount={filtered.length}
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

function isPresent(value: string | null): value is string {
  return Boolean(value);
}
