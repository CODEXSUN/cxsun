import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import type { EnquiryLookup, EnquiryPriority, EnquiryRecord } from "./enquiry.types";

const statusTone = {
  new: "info",
  contacted: "warning",
  qualified: "success",
  unqualified: "neutral"
} as const;

const priorityColor: Record<EnquiryPriority, string> = {
  low: "var(--color-amber-500)",
  normal: "var(--primary)",
  high: "var(--destructive)"
};

export function EnquiryList({
  records,
  users,
  visibleColumns,
  loading,
  onEdit
}: {
  records: EnquiryRecord[];
  users: EnquiryLookup[];
  visibleColumns: Record<string, boolean>;
  loading: boolean;
  onEdit: (record: EnquiryRecord) => void;
}) {
  const userNames = new Map(users.map((user) => [user.id, user.name]));
  const columns: ColumnDef<EnquiryRecord>[] = [
    {
      id: "enquiryNo",
      accessorKey: "enquiryNo",
      header: "ID",
      cell: ({ row }) => (
        <button
          className="cursor-pointer font-medium text-foreground hover:underline"
          type="button"
          onClick={() => onEdit(row.original)}
        >
          #{row.original.enquiryNo}
        </button>
      )
    },
    {
      id: "customer",
      header: "Customer",
      accessorFn: (record) => record.contactName ?? record.capturedName ?? "",
      cell: ({ row }) => row.original.contactName ?? row.original.capturedName ?? "—"
    },
    {
      id: "details",
      accessorKey: "title",
      header: "Enquiry details",
      cell: ({ row }) => (
        <button
          className="block max-w-80 cursor-pointer truncate text-left font-medium text-foreground hover:underline"
          title={row.original.description ?? row.original.title}
          type="button"
          onClick={() => onEdit(row.original)}
        >
          {row.original.title}
        </button>
      )
    },
    {
      id: "listIn",
      accessorKey: "listIn",
      header: "List in",
      cell: ({ row }) => row.original.listIn ?? "—"
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      header: "Due date",
      cell: ({ row }) => row.original.dueDate ?? "—"
    },
    {
      id: "priority",
      accessorKey: "priority",
      header: "Priority",
      cell: ({ row }) => (
        <span
          className="inline-block size-3 rounded-full"
          style={{ backgroundColor: priorityColor[row.original.priority] }}
          title={`${row.original.priority} priority`}
        >
          <span className="sr-only">{row.original.priority} priority</span>
        </span>
      )
    },
    {
      id: "user",
      header: "User",
      accessorFn: (record) =>
        record.assignedUserId ? (userNames.get(record.assignedUserId) ?? "") : "",
      cell: ({ row }) =>
        row.original.assignedUserId
          ? (userNames.get(row.original.assignedUserId) ?? `#${row.original.assignedUserId}`)
          : "—"
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.status.replaceAll("_", " ")}
          tone={statusTone[row.original.status]}
        />
      )
    },
    {
      id: "actions",
      header: "Action",
      enableSorting: false,
      cell: ({ row }) => (
        <div
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          <WorkspaceRowActions
            title={`Enquiry #${row.original.enquiryNo}`}
            onEdit={() => onEdit(row.original)}
          />
        </div>
      )
    }
  ];

  return (
    <WorkspaceTable
      columns={columns.filter(
        (column) =>
          column.id === "enquiryNo" ||
          column.id === "actions" ||
          visibleColumns[column.id ?? ""] !== false
      )}
      data={records}
      emptyState="No enquiries found."
      isLoading={loading}
      minWidth="1020px"
    />
  );
}
