import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { AuditorClientForm } from "./client.form";
import { auditorClientsQueryKey, useAuditorClient, useAuditorClients } from "./client.hooks";
import { AuditorClientList } from "./client.list";
import { AuditorClientShowPage } from "./client.show";
import type { AuditorClientGateway } from "./client.services";
import type { AuditorClientRecord, AuditorClientSavePayload } from "./client.types";

export function AuditorClientWorkspace({
  gateway,
  initialRecordId,
  onRecordNavigate
}: {
  gateway: AuditorClientGateway;
  initialRecordId?: string | undefined;
  onRecordNavigate: (recordId: string | null) => void;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<AuditorClientRecord | null | undefined>(undefined);
  const viewingId = parseRecordId(initialRecordId);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const query = useAuditorClients(gateway);
  const selectedQuery = useAuditorClient(gateway, viewingId);
  const openClient = (id: number) => onRecordNavigate(String(id));
  const showClients = () => onRecordNavigate(null);
  const save = useMutation({
    mutationFn: (payload: AuditorClientSavePayload) =>
      editing ? gateway.update(editing.id, payload) : gateway.create(payload),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: auditorClientsQueryKey });
      toast.success(`Client ${editing ? "updated" : "created"}`, { description: record.name });
      setEditing(undefined);
      openClient(record.id);
    },
    onError: (error) => toast.error("Unable to save client", { description: error.message })
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter(
      (record) =>
        (status === "all" || record.status === status) &&
        (!term ||
          [
            record.name,
            record.companyName,
            record.ownerName,
            record.mobile,
            record.email,
            record.gstin
          ].some((field) => field?.toLowerCase().includes(term)))
    );
  }, [query.data, search, status]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  if (editing !== undefined) {
    return (
      <AuditorClientForm
        key={editing?.id ?? "new"}
        record={editing}
        loading={save.isPending}
        error={save.error?.message ?? ""}
        onBack={() => setEditing(undefined)}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  }
  if (viewingId !== null) {
    return (
      <AuditorClientShowPage
        record={selectedQuery.data}
        gateway={gateway}
        loading={selectedQuery.isLoading}
        error={selectedQuery.error?.message ?? null}
        onBack={showClients}
        onEdit={setEditing}
        onRetry={() => void selectedQuery.refetch()}
      />
    );
  }
  return (
    <WorkspacePage
      title="Clients"
      description="Manage the auditor office client directory."
      technicalName="page.auditor.clients.list"
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
            New client
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchPlaceholder="Search clients"
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
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
      />
      {query.error ? (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}
        </p>
      ) : null}
      <AuditorClientList
        records={records}
        loading={query.isLoading}
        onEdit={setEditing}
        onView={(record) => openClient(record.id)}
        startNumber={(currentPage - 1) * rowsPerPage + 1}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filtered.length)}
        singularLabel="client"
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

function parseRecordId(value: string | null | undefined) {
  const id = Number(value);
  return value && Number.isSafeInteger(id) && id > 0 ? id : null;
}
