import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import type { FrappeRecord } from "./overview.types";

export function FrappeRecordList({
  records,
  loading,
  canSync,
  syncingId,
  onSync
}: {
  records: FrappeRecord[];
  loading: boolean;
  canSync: boolean;
  syncingId: number | null;
  onSync: (record: FrappeRecord) => void;
}) {
  const columns: ColumnDef<FrappeRecord>[] = [
    {
      accessorKey: "enquiryNo",
      header: "ENQUIRY",
      cell: ({ row }) => `#${row.original.enquiryNo}`,
      size: 110
    },
    { accessorKey: "title", header: "TITLE" },
    { accessorKey: "status", header: "CRM STATUS", size: 130 },
    {
      id: "syncState",
      header: "FRAPPE",
      size: 120,
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.remoteName ? "Posted" : "Not posted"}
          tone={row.original.remoteName ? "success" : "warning"}
        />
      )
    },
    {
      id: "remoteName",
      header: "FRAPPE RECORD",
      size: 190,
      cell: ({ row }) => row.original.remoteName || "—"
    },
    {
      id: "updatedAt",
      header: "LOCAL UPDATED",
      size: 180,
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString()
    },
    {
      id: "syncedAt",
      header: "LAST POST",
      size: 180,
      cell: ({ row }) =>
        row.original.syncedAt ? new Date(row.original.syncedAt).toLocaleString() : "—"
    },
    {
      id: "action",
      header: "ACTION",
      size: 125,
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          type="button"
          size="sm"
          variant={row.original.remoteName ? "outline" : "default"}
          disabled={!canSync || syncingId !== null}
          onClick={() => onSync(row.original)}
        >
          {syncingId === row.original.id
            ? "Syncing…"
            : row.original.remoteName
              ? "Post update"
              : "Sync now"}
        </Button>
      )
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No local enquiries found."
      isLoading={loading}
      minWidth="900px"
    />
  );
}
