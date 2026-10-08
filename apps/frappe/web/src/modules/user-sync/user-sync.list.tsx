import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import type { FrappeUserPreview } from "./user-sync.types";

export function FrappeUserList({
  users,
  loading,
  importingId,
  onImport
}: {
  users: FrappeUserPreview[];
  loading: boolean;
  importingId: string | null;
  onImport: (user: FrappeUserPreview) => void;
}) {
  const columns: ColumnDef<FrappeUserPreview>[] = [
    { accessorKey: "name", header: "FRAPPE USER", size: 220 },
    { accessorKey: "email", header: "EMAIL", size: 260 },
    {
      accessorKey: "employeeCode",
      header: "EMPLOYEE CODE",
      size: 160,
      cell: ({ row }) => row.original.employeeCode || "—"
    },
    { accessorKey: "userType", header: "TYPE", size: 140 },
    {
      id: "lastActiveAt",
      header: "LAST ACTIVE",
      size: 180,
      cell: ({ row }) =>
        row.original.lastActiveAt ? new Date(row.original.lastActiveAt).toLocaleString() : "—"
    },
    {
      id: "application",
      header: "APPLICATION",
      size: 140,
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.localUserId ? row.original.localStatus || "Added" : "Not added"}
          tone={row.original.localStatus === "active" ? "success" : "warning"}
        />
      )
    },
    {
      id: "action",
      header: "ACTION",
      size: 130,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={Boolean(row.original.localUserId) || importingId !== null}
          onClick={() => onImport(row.original)}
        >
          {importingId === row.original.frappeUserId
            ? "Adding…"
            : row.original.localUserId
              ? "Added"
              : "Add user"}
        </Button>
      )
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={users}
      emptyState="No enabled Frappe System Users found."
      isLoading={loading}
      minWidth="1100px"
    />
  );
}
