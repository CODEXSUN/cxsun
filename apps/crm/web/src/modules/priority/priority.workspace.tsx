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
import { PriorityForm } from "./priority.form";
import { usePriority } from "./priority.hooks";
import { PriorityList } from "./priority.list";
import { PriorityShow } from "./priority.show";
import {
  activatePriority,
  createPriority,
  deactivatePriority,
  forceDeletePriority,
  updatePriority
} from "./priority.services";
import type { PriorityInput, PriorityRecord } from "./priority.types";

type Action = { record: PriorityRecord; type: "suspend" | "restore" | "force-delete" };

export function PriorityWorkspace() {
  const client = useQueryClient();
  const query = usePriority();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [editing, setEditing] = useState<PriorityRecord | null | undefined>(undefined);
  const [viewing, setViewing] = useState<PriorityRecord | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const save = useMutation({
    mutationFn: (input: PriorityInput) =>
      editing ? updatePriority(editing.id, input) : createPriority(input),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success("Priority saved", { description: record.name });
      setEditing(undefined);
    },
    onError: (error) => toast.error("Unable to save Priority", { description: error.message })
  });
  const lifecycle = useMutation({
    mutationFn: (action: Action) =>
      action.type === "suspend"
        ? deactivatePriority(action.record.id)
        : action.type === "restore"
          ? activatePriority(action.record.id)
          : forceDeletePriority(action.record.id),
    onSuccess: async (_, action) => {
      await client.invalidateQueries({ queryKey: ["crm"] });
      toast.success(
        "Priority " +
          (action.type === "suspend"
            ? "suspended"
            : action.type === "restore"
              ? "restored"
              : "deleted")
      );
      setPending(null);
    },
    onError: (error) => toast.error("Unable to update Priority", { description: error.message })
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
      title="Priorities"
      description="Manage Priority options for enquiries."
      technicalName="page.crm.priority.list"
      actions={
        <div className="flex gap-2">
          <Button type="button" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New Priority
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        searchValue={search}
        searchPlaceholder="Search priorities"
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
      <PriorityList
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
        singularLabel="priority"
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
      <PriorityForm
        open={editing !== undefined}
        record={editing ?? null}
        loading={save.isPending}
        error={save.error?.message ?? ""}
        onCancel={() => setEditing(undefined)}
        onSubmit={(input) => save.mutate(input)}
      />
      <PriorityShow
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
              Priority?
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
