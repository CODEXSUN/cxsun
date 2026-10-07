import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Plus, RefreshCw } from "lucide-react";
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
import { cn } from "@cxsun/ui/lib/utils";
import { DistrictForm } from "./district.form";
import { districtQueryKey, useDistricts, useDistrictStateOptions } from "./district.hooks";
import { DistrictList } from "./district.list";
import {
  activateDistrict,
  createDistrict,
  deactivateDistrict,
  forceDeleteDistrict,
  updateDistrict
} from "./district.services";
import type { DistrictRecord, DistrictSavePayload } from "./district.types";
type Action = { record: DistrictRecord; type: "force-delete" | "restore" | "suspend" };
export function DistrictWorkspace() {
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(100);
  const [editing, setLocalEditing] = useState<DistrictRecord | null | undefined>(undefined);
  const [action, setAction] = useState<Action | null>(null);
  const query = useDistricts();
  const options = useDistrictStateOptions();
  const location = useLocation();
  const navigate = useNavigate();
  const basePath = "/app/core/common/location/districts";
  function setEditing(record: DistrictRecord | null | undefined) {
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
    mutationFn: (value: DistrictSavePayload) =>
      editing ? updateDistrict(editing.id, value) : createDistrict(value),
    onError: showError("Unable to save district"),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: districtQueryKey });
      toast.success(`District ${editing ? "updated" : "created"}`, { description: record.name });
      setEditing(undefined);
    }
  });
  const lifecycle = useMutation({
    mutationFn: ({ record, type }: Action) =>
      type === "force-delete"
        ? forceDeleteDistrict(record.id)
        : type === "restore"
          ? activateDistrict(record.id)
          : deactivateDistrict(record.id),
    onError: showError("Unable to update district"),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: districtQueryKey });
      toast.success("District updated", { description: record.name });
      setAction(null);
    }
  });
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (query.data ?? []).filter((record) => {
      return (
        (status === "all" || record.status === status) &&
        (!term ||
          Object.values(record).some((value) =>
            String(value ?? "")
              .toLowerCase()
              .includes(term)
          ))
      );
    });
  }, [query.data, search, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / size)),
    current = Math.min(page, pages),
    rows = filtered.slice((current - 1) * size, current * size);
  useEffect(() => {
    if (page > pages) setPage(pages);
  }, [page, pages]);
  return (
    <WorkspacePage
      title="Districts"
      description="Manage districts in the current tenant database."
      technicalName="page.common.location.district.list"
      actions={
        <div className="flex gap-2">
          <Button
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            type="button"
            variant="outline"
          >
            <RefreshCw className={cn("size-4", query.isFetching && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={() => setEditing(null)} type="button">
            <Plus className="size-4" />
            New district
          </Button>
        </div>
      }
    >
      <WorkspaceFilters
        filterOptions={[
          { id: "all", label: "All districts" },
          { id: "active", label: "Active" },
          { id: "inactive", label: "Inactive" }
        ]}
        filterValue={status}
        onFilterValueChange={(v) => {
          setStatus(v);
          setPage(1);
        }}
        onSearchValueChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search districts"
        searchValue={search}
      />
      <DistrictList
        loading={query.isFetching && !query.data}
        onEdit={setEditing}
        onForceDelete={(record) => setAction({ record, type: "force-delete" })}
        onRestore={(record) => setAction({ record, type: "restore" })}
        onSuspend={(record) => setAction({ record, type: "suspend" })}
        records={rows}
      />
      <WorkspacePagination
        page={current}
        rowsPerPage={size}
        showingLabel={buildShowingLabel(current, size, filtered.length)}
        singularLabel="district"
        totalCount={filtered.length}
        totalPages={pages}
        onNextPage={() => setPage((v) => Math.min(pages, v + 1))}
        onPageChange={setPage}
        onPreviousPage={() => setPage((v) => Math.max(1, v - 1))}
        onRowsPerPageChange={(v) => {
          setSize(v);
          setPage(1);
        }}
      />
      <DistrictForm
        {...(save.error instanceof Error ? { error: save.error.message } : {})}
        loading={save.isPending}
        onCancel={() => setEditing(undefined)}
        onSubmit={(value) => save.mutate(value)}
        open={editing !== undefined}
        options={options.data ?? []}
        record={editing ?? null}
      />
      <ActionDialog
        action={action}
        loading={lifecycle.isPending}
        onCancel={() => setAction(null)}
        onConfirm={() => action && lifecycle.mutate(action)}
      />
    </WorkspacePage>
  );
}
function ActionDialog({
  action,
  loading,
  onCancel,
  onConfirm
}: {
  action: Action | null;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const verb =
    action?.type === "restore"
      ? "Restore"
      : action?.type === "force-delete"
        ? "Force delete"
        : "Suspend";
  return (
    <AlertDialog open={action !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{verb} district?</AlertDialogTitle>
          <AlertDialogDescription>
            {action?.record.name ?? "Selected district"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={
              action?.type === "force-delete"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
            disabled={loading}
            onClick={onConfirm}
          >
            {verb}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
function showError(title: string) {
  return (error: unknown) =>
    toast.error(title, {
      description: error instanceof Error ? error.message : "Please try again."
    });
}
