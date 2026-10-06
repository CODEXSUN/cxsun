import { Button } from "@cxsun/ui/components/button";
import { WorkspaceDetailTable } from "@cxsun/ui/workspace/show";
import { WorkspaceUpsertDialog } from "@cxsun/ui/workspace/upsert";
import type { ListInRecord } from "./list-in.types";

export function ListInShow({
  record,
  onClose,
  onEdit
}: {
  record: ListInRecord | null;
  onClose: () => void;
  onEdit: (record: ListInRecord) => void;
}) {
  return (
    <WorkspaceUpsertDialog
      open={Boolean(record)}
      onClose={onClose}
      title={record?.name ?? "List In"}
      description="CRM enquiry reference details."
    >
      {record ? (
        <>
          <WorkspaceDetailTable
            rows={[
              ["Name", record.name],

              ["Status", record.status],
              ["Sort order", record.sortOrder],
              ["Created", new Date(record.createdAt).toLocaleString()],
              ["Updated", new Date(record.updatedAt).toLocaleString()],
              ["Updated by", record.updatedBy]
            ]}
          />
          <div className="flex justify-end gap-2 p-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="button" onClick={() => onEdit(record)}>
              Edit
            </Button>
          </div>
        </>
      ) : null}
    </WorkspaceUpsertDialog>
  );
}
