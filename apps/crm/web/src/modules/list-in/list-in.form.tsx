import { useState } from "react";
import { Input } from "@cxsun/ui/components/input";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@cxsun/ui/workspace/upsert";
import { listInSchema } from "./list-in.schema";
import type { ListInInput, ListInRecord } from "./list-in.types";

export function ListInForm({
  record,
  open,
  loading,
  error,
  onCancel,
  onSubmit
}: {
  record: ListInRecord | null;
  open: boolean;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (value: ListInInput) => void;
}) {
  return (
    <WorkspaceUpsertDialog
      open={open}
      onClose={onCancel}
      title={record ? "Edit List In" : "New List In"}
      description="Manage this CRM enquiry reference."
    >
      <ListInFormFields
        key={String(record?.id ?? "new") + ":" + open}
        initial={{ name: record?.name ?? "", sortOrder: record?.sortOrder ?? 1000 }}
        loading={loading}
        error={error}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </WorkspaceUpsertDialog>
  );
}

function ListInFormFields({
  initial,
  loading,
  error,
  onCancel,
  onSubmit
}: {
  initial: ListInInput;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (value: ListInInput) => void;
}) {
  const [value, setValue] = useState(initial);
  const [issue, setIssue] = useState("");
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = listInSchema.safeParse(value);
        if (!parsed.success) {
          setIssue(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setIssue("");
        onSubmit(parsed.data);
      }}
    >
      {issue || error ? (
        <WorkspaceFormBanner title="Unable to save List In">{issue || error}</WorkspaceFormBanner>
      ) : null}
      <WorkspaceFormGrid columns={2}>
        <WorkspaceFormField label="Name" required>
          <Input
            autoFocus
            aria-invalid={Boolean(issue && !value.name.trim())}
            value={value.name}
            onChange={(event) => {
              setIssue("");
              setValue((current) => ({ ...current, name: event.target.value }));
            }}
          />
          {issue && !value.name.trim() ? <p className="text-xs text-destructive">{issue}</p> : null}
        </WorkspaceFormField>
        <WorkspaceFormField label="Sort order">
          <Input
            type="number"
            min={0}
            value={value.sortOrder}
            onChange={(event) =>
              setValue((current) => ({ ...current, sortOrder: Number(event.target.value) }))
            }
          />
        </WorkspaceFormField>
      </WorkspaceFormGrid>
      <WorkspaceFormFooter
        className="mt-6 border-t pt-4"
        onCancel={onCancel}
        primaryLabel={initial.name ? "Update" : "Save"}
        primaryLoading={loading}
      />
    </form>
  );
}
