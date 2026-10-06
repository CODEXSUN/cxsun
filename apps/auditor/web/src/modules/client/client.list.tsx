import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import type { AuditorClientRecord } from "./client.types";

export function AuditorClientList({
  records,
  loading,
  onEdit,
  onView,
  startNumber
}: {
  records: AuditorClientRecord[];
  loading: boolean;
  onEdit: (record: AuditorClientRecord) => void;
  onView: (record: AuditorClientRecord) => void;
  startNumber: number;
}) {
  const columns: ColumnDef<AuditorClientRecord>[] = [
    {
      id: "serial",
      header: "#",
      enableSorting: false,
      size: 64,
      cell: ({ row, table }) =>
        startNumber + table.getRowModel().rows.findIndex((item) => item.id === row.id)
    },
    {
      accessorKey: "name",
      header: "Client",
      cell: ({ row }) => (
        <a
          className="cursor-pointer font-medium text-foreground hover:underline"
          href={`/app/auditor/clients?record=${row.original.id}`}
          onClick={(event) => {
            event.stopPropagation();
            if (
              event.button !== 0 ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }
            event.preventDefault();
            onView(row.original);
          }}
        >
          {row.original.name}
        </a>
      )
    },
    {
      accessorKey: "companyName",
      header: "Company name",
      cell: ({ row }) => row.original.companyName ?? "—"
    },
    {
      accessorKey: "ownerName",
      header: "Owner name",
      cell: ({ row }) => row.original.ownerName ?? "—"
    },
    { accessorKey: "mobile", header: "Mobile", cell: ({ row }) => row.original.mobile ?? "—" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email ?? "—" },
    { accessorKey: "gstin", header: "GSTIN", cell: ({ row }) => row.original.gstin ?? "—" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status}
          tone={row.original.status === "active" ? "success" : "neutral"}
        />
      )
    },
    {
      id: "actions",
      header: () => <div className="text-center">Actions</div>,
      enableSorting: false,
      size: 96,
      cell: ({ row }) => (
        <div
          className="flex w-full justify-center"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <WorkspaceRowActions
            title={row.original.name}
            onView={() => onView(row.original)}
            onEdit={() => onEdit(row.original)}
          />
        </div>
      )
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No clients found."
      isLoading={loading}
      minWidth="1100px"
      onRowClick={onView}
    />
  );
}
