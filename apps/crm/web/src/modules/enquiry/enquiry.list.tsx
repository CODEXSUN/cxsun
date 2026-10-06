import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import { CrmStatusBadge, prioritySwatch } from "../../crm-colors";
import type { EnquiryLookup, EnquiryRecord } from "./enquiry.types";

export function EnquiryList({
  records,
  users,
  visibleColumns,
  loading,
  onShow,
  onEdit
}: {
  records: EnquiryRecord[];
  users: EnquiryLookup[];
  visibleColumns: Record<string, boolean>;
  loading: boolean;
  onShow: (record: EnquiryRecord) => void;
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
          onClick={(event) => {
            event.stopPropagation();
            onShow(row.original);
          }}
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
          onClick={(event) => {
            event.stopPropagation();
            onShow(row.original);
          }}
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
          className={`inline-block size-3 rounded-full ${prioritySwatch(row.original.priority)}`}
          title={`${row.original.priorityName} priority`}
        >
          <span className="sr-only">{row.original.priorityName} priority</span>
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
        <CrmStatusBadge code={row.original.status} label={row.original.statusName} />
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
      onRowClick={onShow}
    />
  );
}
