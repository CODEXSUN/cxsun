import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { Button } from "@cxsun/ui/components/button";
import { Checkbox } from "@cxsun/ui/components/checkbox";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTable } from "@cxsun/ui/workspace/table";
import type { LocalEnquiry, RemoteEnquiry } from "./enquiry-sync.types";

export function RemoteEnquiryList({
  records,
  loading,
  selected,
  busy,
  enabled,
  onSelect,
  onSelectAll,
  onPull
}: {
  records: RemoteEnquiry[];
  loading: boolean;
  selected: Set<string>;
  busy: boolean;
  enabled: boolean;
  onSelect: (name: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onPull: (name: string) => void;
}) {
  const allSelected = records.length > 0 && records.every((item) => selected.has(item.name));
  const someSelected = records.some((item) => selected.has(item.name));
  const columns: ColumnDef<RemoteEnquiry>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          aria-label="Select all shown Frappe enquiries"
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => onSelectAll(checked === true)}
          disabled={!records.length || busy}
        />
      ),
      size: 48,
      enableSorting: false,
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select Frappe enquiry ${row.original.name}`}
          checked={selected.has(row.original.name)}
          onCheckedChange={(checked) => onSelect(row.original.name, checked === true)}
          disabled={busy}
        />
      )
    },
    { accessorKey: "name", header: "FRAPPE ID", size: 120 },
    { accessorKey: "title", header: "ENQUIRY" },
    { accessorKey: "date", header: "DATE", size: 130, cell: ({ row }) => row.original.date || "—" },
    { accessorKey: "status", header: "STATUS", size: 120 },
    { accessorKey: "priority", header: "PRIORITY", size: 120 },
    {
      id: "local",
      header: "LOCAL CRM",
      size: 135,
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={
            row.original.localEnquiryId ? `#${row.original.localEnquiryId} linked` : "Not imported"
          }
          tone={row.original.localEnquiryId ? "success" : "warning"}
        />
      )
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
          variant="outline"
          disabled={!enabled || busy}
          onClick={() => onPull(row.original.name)}
        >
          {row.original.localEnquiryId ? "Pull update" : "Pull"}
        </Button>
      )
    }
  ];
  return (
    <WorkspaceTable
      columns={columns}
      data={records}
      emptyState="No Frappe enquiries found."
      isLoading={loading}
      minWidth="950px"
    />
  );
}

export function LocalEnquiryList({
  records,
  loading,
  selected,
  busy,
  enabled,
  onSelect,
  onSelectAll,
  onPost
}: {
  records: LocalEnquiry[];
  loading: boolean;
  selected: Set<number>;
  busy: boolean;
  enabled: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  onPost: (id: number) => void;
}) {
  const allSelected = records.length > 0 && records.every((item) => selected.has(item.id));
  const someSelected = records.some((item) => selected.has(item.id));
  const columns: ColumnDef<LocalEnquiry>[] = [
    {
      id: "select",
      header: () => (
        <Checkbox
          aria-label="Select all shown local enquiries"
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={(checked) => onSelectAll(checked === true)}
          disabled={!records.length || busy}
        />
      ),
      size: 48,
      enableSorting: false,
      cell: ({ row }) => (
        <Checkbox
          aria-label={`Select local enquiry ${row.original.enquiryNo}`}
          checked={selected.has(row.original.id)}
          onCheckedChange={(checked) => onSelect(row.original.id, checked === true)}
          disabled={busy}
        />
      )
    },
    {
      accessorKey: "enquiryNo",
      header: "CRM ID",
      size: 110,
      cell: ({ row }) => `#${row.original.enquiryNo}`
    },
    { accessorKey: "title", header: "ENQUIRY" },
    { accessorKey: "status", header: "CRM STATUS", size: 135 },
    {
      id: "frappe",
      header: "FRAPPE",
      size: 125,
      cell: ({ row }) => (
        <WorkspaceStatusBadge
          label={row.original.remoteName ? "Linked" : "Not posted"}
          tone={row.original.remoteName ? "success" : "warning"}
        />
      )
    },
    {
      accessorKey: "remoteName",
      header: "FRAPPE ID",
      size: 150,
      cell: ({ row }) => row.original.remoteName || "—"
    },
    {
      accessorKey: "updatedAt",
      header: "LOCAL UPDATED",
      size: 175,
      cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString()
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
          disabled={!enabled || busy}
          onClick={() => onPost(row.original.id)}
        >
          {row.original.remoteName ? "Post update" : "Post"}
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
      minWidth="950px"
    />
  );
}
