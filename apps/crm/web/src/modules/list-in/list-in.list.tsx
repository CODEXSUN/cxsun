import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Trash2 } from "lucide-react";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import type { ListInRecord } from "./list-in.types";

export function ListInList({
  records,
  loading,
  onView,
  onEdit,
  onSuspend,
  onRestore,
  onForceDelete
}: {
  records: ListInRecord[];
  loading: boolean;
  onView: (record: ListInRecord) => void;
  onEdit: (record: ListInRecord) => void;
  onSuspend: (record: ListInRecord) => void;
  onRestore: (record: ListInRecord) => void;
  onForceDelete: (record: ListInRecord) => void;
}) {
  const columns: ColumnDef<ListInRecord>[] = [
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
          {row.original.name}
        </button>
      )
    },

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
      emptyState="No list in records found."
      isLoading={loading}
      minWidth="640px"
      onRowClick={onView}
    />
  );
}
