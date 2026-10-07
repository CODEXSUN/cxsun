import { useState } from "react";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import { WorkspaceDatePicker } from "@cxsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@cxsun/ui/workspace/lookup";
import { prioritySwatch, statusIcon } from "../../crm-colors";
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
import { useEnquiryMasterCreate } from "./enquiry.master-create";
import type {
  EnquiryLookup,
  EnquiryMasterLookup,
  EnquiryRecord,
  EnquirySavePayload
} from "./enquiry.types";

export function EnquiryForm({
  record,
  contacts,
  contactsLoading,
  listOptions,
  statuses,
  priorities,
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
  listOptions: EnquiryMasterLookup[];
  statuses: EnquiryMasterLookup[];
  priorities: EnquiryMasterLookup[];
  users: EnquiryLookup[];
  loading: boolean;
  error: string;
  lookupError: string;
  onBack: () => void;
  onContactSaved: () => Promise<void>;
  onSubmit: (payload: EnquirySavePayload) => void;
}) {
  const createMaster = useEnquiryMasterCreate();
  const [value, setValue] = useState<EnquirySavePayload>(() =>
    record ? fromRecord(record) : emptyEnquiry(statuses, priorities)
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
  const selectedStatus = statuses.find((item) => item.id === value.statusId)?.code ?? "";
  const needsOutcome = ["won", "lost", "closed"].includes(selectedStatus);
  const submit = () => {
    if (needsOutcome && !value.closedReason?.trim()) {
      setIssues((current) => ({ ...current, closedReason: "Enter an outcome reason." }));
      return;
    }
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
                      allowTextValue={false}
                      clearable
                      createMode="inline"
                      createLabel="Create List In"
                      showCreateWhenEmpty
                      showAllOptionsOnFocus
                      options={listOptions
                        .filter((item) => item.status === "active")
                        .map((item) => ({ label: item.name, value: String(item.id) }))}
                      placeholder="Choose list"
                      value={value.listInId ? String(value.listInId) : ""}
                      invalid={Boolean(issues.listInId)}
                      onCreate={createMaster.listIn}
                      onTextChange={() => set("listInId", null)}
                      onValueChange={(selected) =>
                        set("listInId", selected ? Number(selected) : null)
                      }
                    />
                    {issues.listInId ? <FieldError>{issues.listInId}</FieldError> : null}
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
                    <WorkspaceLookup
                      allowTextValue={false}
                      clearable={false}
                      createMode="inline"
                      createLabel="Create Priority"
                      showCreateWhenEmpty
                      showAllOptionsOnFocus
                      options={priorities
                        .filter((item) => item.status === "active")
                        .map((item) => ({
                          label: item.name,
                          value: String(item.id),
                          swatchClassName: prioritySwatch(item.code ?? "")
                        }))}
                      value={value.priorityId ? String(value.priorityId) : ""}
                      onCreate={createMaster.priority}
                      onTextChange={() => set("priorityId", 0)}
                      onValueChange={(selected) => set("priorityId", Number(selected))}
                    />
                  </WorkspaceFormField>
                  <WorkspaceFormField label="Status">
                    <WorkspaceLookup
                      allowTextValue={false}
                      clearable={false}
                      createMode="inline"
                      createLabel="Create Status"
                      showCreateWhenEmpty
                      showAllOptionsOnFocus
                      options={statuses
                        .filter((item) => item.status === "active")
                        .map((item) => ({
                          label: item.name,
                          value: String(item.id),
                          leadingIcon: statusIcon(item.code ?? "")
                        }))}
                      value={value.statusId ? String(value.statusId) : ""}
                      onCreate={createMaster.status}
                      onTextChange={() => set("statusId", 0)}
                      onValueChange={(selected) => set("statusId", Number(selected))}
                    />
                  </WorkspaceFormField>
                  {needsOutcome ? (
                    <WorkspaceFormField label="Outcome reason" required>
                      <Textarea
                        value={value.closedReason ?? ""}
                        aria-invalid={Boolean(issues.closedReason)}
                        onChange={(event) => set("closedReason", event.target.value)}
                      />
                      {issues.closedReason ? <FieldError>{issues.closedReason}</FieldError> : null}
                    </WorkspaceFormField>
                  ) : null}
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

function emptyEnquiry(
  statuses: EnquiryMasterLookup[],
  priorities: EnquiryMasterLookup[]
): EnquirySavePayload {
  return {
    title: "",
    description: null,
    contactId: null,
    capturedName: null,
    capturedEmail: null,
    capturedPhone: null,
    source: "manual",
    sourceReference: null,
    listInId: null,
    statusId: statuses.find((item) => item.code === "new")?.id ?? 0,
    priorityId: priorities.find((item) => item.code === "normal")?.id ?? 0,
    assignedUserId: null,
    enquiredAt: new Date().toISOString(),
    dueDate: null,
    closedReason: null
  };
}

function fromRecord(record: EnquiryRecord): EnquirySavePayload {
  return {
    title: record.title,
    description: record.description,
    contactId: record.contactId,
    capturedName: record.capturedName,
    capturedEmail: record.capturedEmail,
    capturedPhone: record.capturedPhone,
    source: record.source,
    sourceReference: record.sourceReference,
    listInId: record.listInId,
    statusId: record.statusId,
    priorityId: record.priorityId,
    assignedUserId: record.assignedUserId,
    enquiredAt: new Date(record.enquiredAt).toISOString(),
    dueDate: record.dueDate,
    closedReason: record.closedReason
  };
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
    closedReason: value.closedReason?.trim() || null
  };
}

function titleFromMessage(message: string | null) {
  return Array.from((message ?? "").replace(/\s+/gu, " ").trim())
    .slice(0, 100)
    .join("");
}
