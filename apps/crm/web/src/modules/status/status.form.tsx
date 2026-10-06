import { useState } from "react";
import { Input } from "@cxsun/ui/components/input";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceFormGrid,
  WorkspaceUpsertDialog
} from "@cxsun/ui/workspace/upsert";
import { statusSchema } from "./status.schema";
import type { StatusInput, StatusRecord } from "./status.types";

export function StatusForm({
  record,
  open,
  loading,
  error,
  onCancel,
  onSubmit
}: {
  record: StatusRecord | null;
  open: boolean;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (value: StatusInput) => void;
}) {
  return (
    <WorkspaceUpsertDialog
      open={open}
      onClose={onCancel}
      title={record ? "Edit Status" : "New Status"}
      description="Manage this CRM enquiry reference."
    >
      <StatusFormFields
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

function StatusFormFields({
  initial,
  loading,
  error,
  onCancel,
  onSubmit
}: {
  initial: StatusInput;
  loading: boolean;
  error: string;
  onCancel: () => void;
  onSubmit: (value: StatusInput) => void;
}) {
  const [value, setValue] = useState(initial);
  const [issue, setIssue] = useState("");
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const parsed = statusSchema.safeParse(value);
        if (!parsed.success) {
          setIssue(parsed.error.issues[0]?.message ?? "Check the details.");
          return;
        }
        setIssue("");
        onSubmit(parsed.data);
      }}
    >
      {issue || error ? (
        <WorkspaceFormBanner title="Unable to save Status">{issue || error}</WorkspaceFormBanner>
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
