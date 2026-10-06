import { Trash2 } from "lucide-react";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { WorkspaceProtectedIndicator } from "@cxsun/ui/workspace/protected-indicator";
import { WorkspaceRowActions } from "@cxsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import type { TenantUser } from "./tenant-user.types";

export function TenantUserList({
  loading,
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  records
}: {
  loading: boolean;
  onEdit: (record: TenantUser) => void;
  onForceDelete: (record: TenantUser) => void;
  onRestore: (record: TenantUser) => void;
  onSuspend: (record: TenantUser) => void;
  records: TenantUser[];
}) {
  const columns: ColumnDef<TenantUser>[] = [
    {
      accessorKey: "name",
      cell: ({ row }) => <RecordName record={row.original} onEdit={onEdit} />,
      header: "User"
    },
    { accessorKey: "email", header: "Email" },
    {
      cell: ({ row }) =>
        row.original.roles.length ? row.original.roles.map((role) => role.label).join(", ") : "—",
      header: "Role",
      id: "role"
    },
    {
      accessorKey: "status",
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={statusLabel(row.original.status)}
          tone={
            row.original.status === "active"
              ? "success"
              : row.original.status === "suspended"
                ? "danger"
                : "neutral"
          }
        />
      ),
      header: "Status"
    },
    {
      cell: ({ row }) => (
        <Actions
          record={row.original}
          onEdit={onEdit}
          onForceDelete={onForceDelete}
          onRestore={onRestore}
          onSuspend={onSuspend}
        />
      ),
      enableSorting: false,
      header: () => <div className="text-center">Actions</div>,
      id: "actions",
      size: 96
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No users found."
      isLoading={loading}
      minWidth="860px"
    />
  );
}
function RecordName({
  onEdit,
  record
}: {
  onEdit: (record: TenantUser) => void;
  record: TenantUser;
}) {
  return record.isProtected ? (
    <span className="font-medium">{record.name}</span>
  ) : (
    <button
      className="cursor-pointer font-medium text-foreground hover:underline"
      onClick={() => onEdit(record)}
      type="button"
    >
      {record.name}
    </button>
  );
}
function Actions({
  onEdit,
  onForceDelete,
  onRestore,
  onSuspend,
  record
}: {
  onEdit: (record: TenantUser) => void;
  onForceDelete: (record: TenantUser) => void;
  onRestore: (record: TenantUser) => void;
  onSuspend: (record: TenantUser) => void;
  record: TenantUser;
}) {
  return (
    <div
      className="flex w-full justify-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {record.isProtected ? (
        <WorkspaceProtectedIndicator label="Protected user" />
      ) : (
        <WorkspaceRowActions
          actions={[
            {
              id: "force-delete",
              icon: <Trash2 className="size-4" />,
              label: "Force delete",
              onSelect: () => onForceDelete(record),
              tone: "destructive"
            }
          ]}
          deleteLabel="Suspend"
          isSuspended={record.status !== "active"}
          onDelete={() => onSuspend(record)}
          onEdit={() => onEdit(record)}
          onRestore={() => onRestore(record)}
          title={record.name}
        />
      )}
    </div>
  );
}
function statusLabel(status: TenantUser["status"]) {
  return status === "active" ? "Active" : status === "suspended" ? "Suspended" : "Inactive";
}
