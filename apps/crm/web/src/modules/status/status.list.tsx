import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Trash2 } from "lucide-react";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import { CrmStatusBadge } from "../../crm-colors";
import type { StatusRecord } from "./status.types";

export function StatusList({
  records,
  loading,
  onView,
  onEdit,
  onSuspend,
  onRestore,
  onForceDelete
}: {
  records: StatusRecord[];
  loading: boolean;
  onView: (record: StatusRecord) => void;
  onEdit: (record: StatusRecord) => void;
  onSuspend: (record: StatusRecord) => void;
  onRestore: (record: StatusRecord) => void;
  onForceDelete: (record: StatusRecord) => void;
}) {
  const columns: ColumnDef<StatusRecord>[] = [
    { accessorKey: "sortOrder", header: "ORDER", size: 90 },
    {
      accessorKey: "name",
      header: "NAME",
      cell: ({ row }) => (
        <button
          type="button"
          className="cursor-pointer font-medium hover:underline"
          onClick={(event) => {
            event.stopPropagation();
            onView(row.original);
          }}
        >
          <CrmStatusBadge code={row.original.code} label={row.original.name} />
        </button>
      )
    },
    { accessorKey: "code", header: "CODE" },
    {
      accessorKey: "status",
      header: "STATUS",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status === "active" ? "Active" : "Inactive"}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      )
    },
    {
      id: "actions",
      header: "ACTION",
      enableSorting: false,
      cell: ({ row }) => (
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <WorkspaceRowActions
            title={row.original.name}
            onView={() => onView(row.original)}
            onEdit={() => onEdit(row.original)}
            isSuspended={row.original.status === "inactive"}
            onDelete={() => onSuspend(row.original)}
            onRestore={() => onRestore(row.original)}
            actions={[
              {
                id: "force-delete",
                label: "Force delete",
                icon: <Trash2 className="size-4" />,
                tone: "destructive",
                onSelect: () => onForceDelete(row.original)
              }
            ]}
          />
        </div>
      )
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No statuses records found."
      isLoading={loading}
      minWidth="640px"
      onRowClick={onView}
    />
  );
}
