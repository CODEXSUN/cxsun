import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormSurface,
  WorkspaceUpsertPage
} from "@cxsun/ui/workspace/upsert";
import { auditorClientSchema } from "./client.schema";
import type { AuditorClientRecord, AuditorClientSavePayload } from "./client.types";

const statusOptions = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" }
];

export function AuditorClientForm({
  record,
  loading,
  error,
  onBack,
  onSubmit
}: {
  record: AuditorClientRecord | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onSubmit: (payload: AuditorClientSavePayload) => void;
}) {
  const [value, setValue] = useState<AuditorClientSavePayload>(() =>
    record
      ? {
          name: record.name,
          companyName: record.companyName,
          ownerName: record.ownerName,
          mobile: record.mobile,
          email: record.email,
          gstin: record.gstin,
          status: record.status
        }
      : {
          name: "",
          companyName: null,
          ownerName: null,
          mobile: null,
          email: null,
          gstin: null,
          status: "active"
        }
  );
  const [issues, setIssues] = useState<Record<string, string>>({});
  const set = <Key extends keyof AuditorClientSavePayload>(
    key: Key,
    next: AuditorClientSavePayload[Key]
  ) => {
    setValue((current) => ({ ...current, [key]: next }));
    setIssues((current) => ({ ...current, [key]: "" }));
  };
  const submit = () => {
    const parsed = auditorClientSchema.safeParse({
      ...value,
      name: value.name.trim(),
      companyName: value.companyName?.trim() || null,
      ownerName: value.ownerName?.trim() || null,
      mobile: value.mobile?.trim() || null,
      email: value.email?.trim() || null,
      gstin: value.gstin?.trim().toUpperCase() || null
    });
    if (!parsed.success) {
      setIssues(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message])
        )
      );
      return;
    }
    setIssues({});
    onSubmit(parsed.data);
  };
  const shownError = Object.values(issues).find(Boolean) || error;
  return (
    <WorkspaceUpsertPage
      title={record ? `Edit ${record.name}` : "New client"}
      onBack={onBack}
      className="max-w-3xl"
    >
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <WorkspaceFormSurface>
          <WorkspaceFormBody>
            {shownError ? (
              <WorkspaceFormBanner title="Unable to save client">{shownError}</WorkspaceFormBanner>
            ) : null}
            <div className="grid gap-4 md:grid-cols-2">
              <WorkspaceFormField label="Client name" required>
                <Input
                  value={value.name}
                  aria-invalid={Boolean(issues.name)}
                  onChange={(event) => set("name", event.target.value)}
                />
                {issues.name ? <FieldError>{issues.name}</FieldError> : null}
              </WorkspaceFormField>
              <WorkspaceFormField label="Company name">
                <Input
                  value={value.companyName ?? ""}
                  aria-invalid={Boolean(issues.companyName)}
                  onChange={(event) => set("companyName", event.target.value || null)}
                />
                {issues.companyName ? <FieldError>{issues.companyName}</FieldError> : null}
              </WorkspaceFormField>
              <WorkspaceFormField label="Owner name">
                <Input
                  value={value.ownerName ?? ""}
                  aria-invalid={Boolean(issues.ownerName)}
                  onChange={(event) => set("ownerName", event.target.value || null)}
                />
                {issues.ownerName ? <FieldError>{issues.ownerName}</FieldError> : null}
              </WorkspaceFormField>
              <WorkspaceFormField label="Mobile">
                <Input
                  type="tel"
                  value={value.mobile ?? ""}
                  aria-invalid={Boolean(issues.mobile)}
                  onChange={(event) => set("mobile", event.target.value || null)}
                />
                {issues.mobile ? <FieldError>{issues.mobile}</FieldError> : null}
              </WorkspaceFormField>
              <WorkspaceFormField label="Email">
                <Input
                  type="email"
                  value={value.email ?? ""}
                  aria-invalid={Boolean(issues.email)}
                  onChange={(event) => set("email", event.target.value || null)}
                />
                {issues.email ? <FieldError>{issues.email}</FieldError> : null}
              </WorkspaceFormField>
              <WorkspaceFormField label="GSTIN">
                <Input
                  value={value.gstin ?? ""}
                  maxLength={15}
                  aria-invalid={Boolean(issues.gstin)}
                  onChange={(event) => set("gstin", event.target.value.toUpperCase() || null)}
                />
                {issues.gstin ? <FieldError>{issues.gstin}</FieldError> : null}
              </WorkspaceFormField>
              <WorkspaceFormField label="Status">
                <WorkspaceSelect
                  options={statusOptions}
                  value={value.status}
                  onValueChange={(status) =>
                    set("status", status as AuditorClientSavePayload["status"])
                  }
                />
              </WorkspaceFormField>
            </div>
          </WorkspaceFormBody>
          <WorkspaceFormActions>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : record ? "Update client" : "Save client"}
            </Button>
            <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
              Cancel
            </Button>
          </WorkspaceFormActions>
        </WorkspaceFormSurface>
      </form>
    </WorkspaceUpsertPage>
  );
}

function FieldError({ children }: { children: string }) {
  return <p className="text-xs text-destructive">{children}</p>;
}
