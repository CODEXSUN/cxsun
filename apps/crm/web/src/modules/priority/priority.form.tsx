import { useState } from "react";
import { Input } from "@cxsun/ui/components/input";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@cxsun/ui/workspace/upsert";
import { prioritySchema } from "./priority.schema";
import type { PriorityInput, PriorityRecord } from "./priority.types";

export function PriorityForm({
  record,
  open,
  loading,
  error,
  onCancel,
  onSubmit
}: {
  record: PriorityRecord | null;
  open: boolean;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (value: PriorityInput) => void;
}) {
  return (
    <WorkspaceUpsertDialog
      open={open}
      onClose={onCancel}
      title={record ? "Edit Priority" : "New Priority"}
      description="Manage this CRM enquiry reference."
    >
      <PriorityFormFields
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

function PriorityFormFields({
  initial,
  loading,
  error,
  onCancel,
  onSubmit
}: {
  initial: PriorityInput;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (value: PriorityInput) => void;
}) {
  const [value, setValue] = useState(initial);
  const [issue, setIssue] = useState("");
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = prioritySchema.safeParse(value);
        if (!parsed.success) {
          setIssue(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setIssue("");
        onSubmit(parsed.data);
      }}
    >
      {issue || error ? (
        <WorkspaceFormBanner title="Unable to save Priority">{issue || error}</WorkspaceFormBanner>
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
