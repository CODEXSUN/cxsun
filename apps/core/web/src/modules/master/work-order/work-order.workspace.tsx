import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceFilters } from "@cxsun/ui/workspace/filters";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspacePagination } from "@cxsun/ui/workspace/pagination";
import { buildShowingLabel } from "@cxsun/ui/workspace/utils";
import { cn } from "@cxsun/ui/lib/utils";
import { WorkOrderForm } from "./work-order.form";
import { useWorkOrders } from "./work-order.hooks";
import { WorkOrderList, isProtectedWorkOrder, workOrderColumns } from "./work-order.list";
import {
  createWorkOrder,
  forceDeleteWorkOrder,
  setWorkOrderActive,
  updateWorkOrder
} from "./work-order.services";
import type { WorkOrderRecord, WorkOrderSavePayload } from "./work-order.types";

const workOrderFilterOptions = [
  { id: "all", label: "All work orders" },
  { id: "active", label: "Active" },
  { id: "inactive", label: "Inactive" }
];

export function WorkOrderWorkspace() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({});
  const [editing, setLocalEditing] = useState<WorkOrderRecord | null | undefined>(undefined);
  const query = useWorkOrders(search);
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = "/app/core/master/work-order";
  function setEditing(record: WorkOrderRecord | null | undefined) {
    setLocalEditing(record);
    const path =
      record === undefined
        ? basePath
        : record === null
          ? `${basePath}/new`
          : `${basePath}/${encodeURIComponent(record.id)}/edit`;
    if (location.pathname !== path) void navigate({ to: path });
  }
  useEffect(() => {
    const tail = location.pathname.slice(basePath.length).split("/").filter(Boolean);
    if (tail.length === 0) {
      setLocalEditing(undefined);
      return;
    }
    if (tail[0] === "new" && tail.length === 1) {
      setLocalEditing(null);
      return;
    }
    if (tail.length > 2 || (tail[1] && tail[1] !== "edit")) return;
    let id: string;
    try {
      id = decodeURIComponent(tail[0]!);
    } catch {
      return;
    }
    const record = query.data?.find((entry) => String(entry.id) === id);
    setLocalEditing((current) =>
      current && record && current.id === record.id ? current : record
    );
  }, [location.pathname, query.data]);
  const save = useMutation({
    mutationFn: (payload: WorkOrderSavePayload) =>
      editing ? updateWorkOrder(editing.id, payload) : createWorkOrder(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["core", "work-order", "list"] });
      toast.success("Work order saved");
      setEditing(undefined);
    },
    onError: (error) =>
      toast.error("Unable to save work order", {
        description: error instanceof Error ? error.message : "Please try again."
      })
  });
  const rowAction = useMutation({
    mutationFn: ({ record, type }: { record: WorkOrderRecord; type: "delete" | "toggle" }) =>
      type === "delete"
        ? forceDeleteWorkOrder(record.id)
        : setWorkOrderActive(record.id, !record.isActive),
    onSuccess: async (record, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["core", "work-order", "list"] });
      toast.success(
        variables.type === "delete" ? "Work order force deleted" : "Work order status updated",
        { description: record.name }
      );
    },
    onError: (error) =>
      toast.error("Unable to update work order", {
        description: error instanceof Error ? error.message : "Please try again."
      })
  });
  const rows = query.data ?? [];
  const columnOptions = useMemo(
    () =>
      workOrderColumns.map((column) => ({
        checked: visibleColumns[column.id] ?? true,
        id: column.id,
        label: column.label,
        onCheckedChange: (checked: boolean) =>
          setVisibleColumns((current) => ({ ...current, [column.id]: checked }))
      })),
    [visibleColumns]
  );
  const filteredRows = useMemo(
    () =>
      rows.filter((record) => {
        if (statusFilter === "active") return record.isActive;
        if (statusFilter === "inactive") return !record.isActive;
        return true;
      }),
    [rows, statusFilter]
  );
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  if (editing !== undefined) {
    return (
      <WorkOrderForm
        error={save.error instanceof Error ? save.error.message : ""}
        existingRecords={rows}
        loading={save.isPending}
        record={editing}
        onBack={() => setEditing(undefined)}
        onSubmit={(payload) => save.mutate(payload)}
      />
    );
  }

  return (
    <WorkspacePage
      title="Work Orders"
      description="Manage work order code, name, status, and lifecycle."
      actions={
        <div className="flex gap-2">
          <Button className="h-9 rounded-md" variant="outline" onClick={() => void query.refetch()}>
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button className="h-9 rounded-md" onClick={() => setEditing(null)}>
            <Plus className="size-4" />
            New
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        columnOptions={columnOptions}
        filterOptions={workOrderFilterOptions}
        filterValue={statusFilter}
        searchPlaceholder="Search code or work order"
        searchValue={search}
        onFilterValueChange={setStatusFilter}
        onSearchValueChange={setSearch}
        onShowAllColumns={() =>
          setVisibleColumns(Object.fromEntries(workOrderColumns.map((column) => [column.id, true])))
        }
      />
      <WorkOrderList
        loading={query.isFetching && !query.data}
        records={pageRows}
        visibleColumns={visibleColumns}
        onEdit={(record) => {
          if (!isProtectedWorkOrder(record)) setEditing(record);
        }}
        onForceDelete={(record) => {
          if (window.confirm(`Force delete ${record.name}? This cannot be undone.`))
            rowAction.mutate({ record, type: "delete" });
        }}
        onToggle={(record) => rowAction.mutate({ record, type: "toggle" })}
      />
      <WorkspacePagination
        page={currentPage}
        rowsPerPage={rowsPerPage}
        showingLabel={buildShowingLabel(currentPage, rowsPerPage, filteredRows.length)}
        singularLabel="work order"
        totalCount={filteredRows.length}
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
