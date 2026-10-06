import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import { WorkspaceDatePicker } from "@cxsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@cxsun/ui/workspace/lookup";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import {
  WorkspaceFormActions,
  WorkspaceFormBanner,
  WorkspaceFormBody,
  WorkspaceFormField,
  WorkspaceFormSurface,
  WorkspaceUpsertPage
} from "@cxsun/ui/workspace/upsert";
import { enquirySchema } from "./enquiry.schema";
import { EnquiryCustomerFields } from "./enquiry.customer-fields";
import type { EnquiryLookup, EnquiryRecord, EnquirySavePayload } from "./enquiry.types";

const statusOptions = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Qualified", value: "qualified" },
  { label: "Unqualified", value: "unqualified" }
];
const priorityOptions = [
  { label: "Low", value: "low" },
  { label: "Normal", value: "normal" },
  { label: "High", value: "high" }
];

export function EnquiryForm({
  record,
  contacts,
  contactsLoading,
  listOptions,
  users,
  loading,
  error,
  lookupError,
  onBack,
  onContactSaved,
  onSubmit
}: {
  record: EnquiryRecord | null;
  contacts: EnquiryLookup[];
  contactsLoading: boolean;
  listOptions: string[];
  users: EnquiryLookup[];
  loading: boolean;
  error: string;
  lookupError: string;
  onBack: () => void;
  onContactSaved: () => Promise<void>;
  onSubmit: (payload: EnquirySavePayload) => void;
}) {
  const [value, setValue] = useState<EnquirySavePayload>(() =>
    record ? fromRecord(record) : emptyEnquiry()
  );
  const [issues, setIssues] = useState<Record<string, string>>({});
  const set = <Key extends keyof EnquirySavePayload>(key: Key, next: EnquirySavePayload[Key]) => {
    setValue((current) => ({ ...current, [key]: next }));
    setIssues((current) => ({ ...current, [key]: "" }));
  };
  const setCustomer = (
    next: Partial<Pick<EnquirySavePayload, "contactId" | "capturedName" | "capturedPhone">>
  ) => {
    setValue((current) => ({ ...current, ...next }));
    setIssues((current) => ({ ...current, capturedName: "", capturedPhone: "" }));
  };
  const shownError = Object.values(issues).find(Boolean) || error;
  const suggestedTitle = titleFromMessage(value.description);
  const submit = () => {
    const payload = normalize(value);
    const result = enquirySchema.safeParse(payload);
    if (!result.success) {
      setIssues(
        Object.fromEntries(
          result.error.issues.map((issue) => [String(issue.path[0]), issue.message])
        )
      );
      return;
    }
    setIssues({});
    onSubmit(payload);
  };
  return (
    <WorkspaceUpsertPage
      className="max-w-5xl"
      title={record ? `Edit enquiry #${record.enquiryNo}` : "New enquiry form"}
      {...(record ? { description: record.title } : {})}
      onBack={onBack}
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
              <WorkspaceFormBanner title="Unable to save enquiry">{shownError}</WorkspaceFormBanner>
            ) : null}
            {lookupError ? (
              <WorkspaceFormBanner title="Lookup unavailable" tone="warning">
                {lookupError}
              </WorkspaceFormBanner>
            ) : null}
            <div className="grid items-stretch gap-4 lg:grid-cols-2">
              <section
                className="min-w-0 rounded-md border border-border/80 p-4 sm:p-5"
                aria-label="Enquiry content"
              >
                <div className="space-y-5">
                  <EnquiryCustomerFields
                    contacts={contacts}
                    loading={contactsLoading}
                    value={value}
                    error={issues.capturedName ?? ""}
                    mobileError={issues.capturedPhone ?? ""}
                    onChange={setCustomer}
                    onContactSaved={onContactSaved}
                  />
                  <WorkspaceFormField label="Enquiry message" required={!value.title.trim()}>
                    <Textarea
                      className="min-h-52 resize-y"
                      rows={8}
                      value={value.description ?? ""}
                      aria-invalid={Boolean(issues.description)}
                      onChange={(event) => set("description", event.target.value)}
                    />
                    {issues.description ? <FieldError>{issues.description}</FieldError> : null}
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Title">
                    <Input
                      value={value.title}
                      placeholder={suggestedTitle || "Auto-filled from the enquiry message"}
                      aria-invalid={Boolean(issues.title)}
                      onChange={(event) => set("title", event.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave blank to use the first 100 characters of the enquiry message.
                    </p>
                    {issues.title ? <FieldError>{issues.title}</FieldError> : null}
                  </WorkspaceFormField>
                </div>
              </section>
              <section
                className="min-w-0 rounded-md border border-border/80 p-4 sm:p-5"
                aria-label="Enquiry details"
              >
                <div className="space-y-5">
                  <WorkspaceFormField label="List in">
                    <WorkspaceLookup
                      allowTextValue
                      clearable
                      showAllOptionsOnFocus
                      options={listOptions.map((item) => ({ label: item, value: item }))}
                      placeholder="Choose or enter list"
                      value={value.listIn ?? ""}
                      invalid={Boolean(issues.listIn)}
                      onValueChange={(selected) => set("listIn", selected || null)}
                    />
                    {issues.listIn ? <FieldError>{issues.listIn}</FieldError> : null}
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Assigned to">
                    <WorkspaceLookup
                      allowTextValue={false}
                      options={users
                        .filter((item) => item.status === "active")
                        .map((item) => ({ value: String(item.id), label: item.name }))}
                      placeholder="Unassigned"
                      value={value.assignedUserId ? String(value.assignedUserId) : ""}
                      onValueChange={(selected) =>
                        set("assignedUserId", selected ? Number(selected) : null)
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Priority">
                    <WorkspaceSelect
                      options={priorityOptions}
                      value={value.priority}
                      onValueChange={(selected) =>
                        set("priority", selected as EnquirySavePayload["priority"])
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Status">
                    <WorkspaceSelect
                      options={statusOptions}
                      value={value.status}
                      onValueChange={(selected) =>
                        set("status", selected as EnquirySavePayload["status"])
                      }
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Due date">
                    <WorkspaceDatePicker
                      value={value.dueDate ?? ""}
                      onValueChange={(date) => set("dueDate", date || null)}
                    />
                    {value.dueDate ? (
                      <button
                        className="text-xs text-muted-foreground underline"
                        type="button"
                        onClick={() => set("dueDate", null)}
                      >
                        Clear due date
                      </button>
                    ) : null}
                  </WorkspaceFormField>
                </div>
              </section>
            </div>
          </WorkspaceFormBody>
          <WorkspaceFormActions>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : record ? "Update enquiry" : "Save enquiry"}
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

function emptyEnquiry(): EnquirySavePayload {
  return {
    title: "",
    description: null,
    contactId: null,
    capturedName: null,
    capturedEmail: null,
    capturedPhone: null,
    source: "manual",
    sourceReference: null,
    listIn: null,
    status: "new",
    priority: "normal",
    assignedUserId: null,
    enquiredAt: new Date().toISOString(),
    dueDate: null,
    closedReason: null
  };
}

function fromRecord(record: EnquiryRecord): EnquirySavePayload {
  const {
    id: _id,
    enquiryNo: _enquiryNo,
    uuid: _uuid,
    contactName: _contactName,
    createdBy: _createdBy,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...value
  } = record;
  return { ...value, enquiredAt: new Date(record.enquiredAt).toISOString() };
}

function normalize(value: EnquirySavePayload): EnquirySavePayload {
  return {
    ...value,
    title: value.title.trim(),
    source: value.source.trim(),
    description: value.description?.trim() || null,
    capturedName: value.capturedName?.trim() || null,
    capturedEmail: value.capturedEmail?.trim() || null,
    capturedPhone: value.capturedPhone?.trim() || null,
    sourceReference: value.sourceReference?.trim() || null,
    listIn: value.listIn?.trim() || null,
    closedReason: value.closedReason?.trim() || null
  };
}

function titleFromMessage(message: string | null) {
  return Array.from((message ?? "").replace(/\s+/gu, " ").trim())
    .slice(0, 100)
    .join("");
}
