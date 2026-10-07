import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@cxsun/ui/components/alert-dialog";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { StatusForm } from "./status.form";
import { useStatus } from "./status.hooks";
import { StatusList } from "./status.list";
import { StatusShow } from "./status.show";
import {
  activateStatus,
  createStatus,
  deactivateStatus,
  forceDeleteStatus,
  updateStatus
} from "./status.services";
import type { StatusInput, StatusRecord } from "./status.types";

type Action = { record: StatusRecord; type: "suspend" | "restore" | "force-delete" };

export function StatusWorkspace() {
  const client = useQueryClient();
  const query = useStatus();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<StatusRecord | null | undefined>(undefined);
  const [viewing, setViewing] = useState<StatusRecord | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const save = useMutation({
    mutationFn: (input: StatusInput) =>
      editing ? updateStatus(editing.id, input) : createStatus(input),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Status saved", { description: record.name });
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save Status", { description: error.message })
  });
  const lifecycle = useMutation({
    mutationFn: (action: Action) =>
      action.type === "suspend"
        ? deactivateStatus(action.record.id)
        : action.type === "restore"
          ? activateStatus(action.record.id)
          : forceDeleteStatus(action.record.id),
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success(
        "Status " +
          (action.type === "suspend"
            ? "suspended"
            : action.type === "restore"
              ? "restored"
              : "deleted")
      );
      setPending(null);
    },
    onError: (error) => toast.error("Unable to update Status", { description: error.message })
  });
  const filtered = useMemo(
    () =>
      (query.data ?? []).filter(
        (record) =>
          (status === "all" || record.status === status) &&
          record.name.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [query.data, search, status]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const records = filtered.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  return (
    <WorkspacePage
      title="Statuses"
      description="Manage Status options for enquiries."
      technicalName="page.crm.status.list"
      actions={
        <div className="flex gap-2">
          <Button type="button" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New Status
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchValue={search}
        searchPlaceholder="Search statuses"
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
          { id: "all", label: "All records" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
      />
      {query.error ? (
        <p role="alert" className="text-sm text-destructive">
          {query.error.message}
        </p>
      ) : null}
      <StatusList
        records={records}
        loading={query.isLoading}
        onView={setViewing}
        onEdit={setEditing}
        onSuspend={(record) => setPending({ record, type: "suspend" })}
        onRestore={(record) => setPending({ record, type: "restore" })}
        onForceDelete={(record) => setPending({ record, type: "force-delete" })}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filtered.length)}
        singularLabel="status"
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
      <StatusForm
        open={editing !== undefined}
        record={editing ?? null}
        loading={save.isPending}
        error={save.error?.message ?? ""}
        onCancel={() => setEditing(undefined)}
        onSubmit={(input) => save.mutate(input)}
      />
      <StatusShow
        record={viewing}
        onClose={() => setViewing(null)}
        onEdit={(record) => {
          setViewing(null);
          setEditing(record);
        }}
      />
      <AlertDialog open={Boolean(pending)} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.type === "force-delete"
                ? "Force delete"
                : pending?.type === "restore"
                  ? "Restore"
                  : "Suspend"}{" "}
              Status?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending?.record.name}{" "}
              {pending?.type === "force-delete"
                ? "will be removed if no enquiry uses it."
                : "will change status."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={lifecycle.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={lifecycle.isPending}
              onClick={() => pending && lifecycle.mutate(pending)}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </WorkspacePage>
  );
}
