import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Timer, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Textarea } from "@cxsun/ui/components/textarea";
import { WorkspaceDatePicker } from "@cxsun/ui/workspace/date-picker";
import { WorkspaceLookup } from "@cxsun/ui/workspace/lookup";
import { WorkspaceDetailTable, WorkspaceShowCard } from "@cxsun/ui/workspace/show";
import { CrmColorLabel, prioritySwatch, statusIcon } from "../../crm-colors";
import {
  enquiryActivityQueryKey,
  enquiryAttentionQueryKey,
  enquiryDetailQueryKey,
  enquiriesQueryKey
} from "./enquiry.hooks";
import { useEnquiryMasterCreate } from "./enquiry.master-create";
import { updateEnquiryProperties } from "./enquiry.services";
import { formatDate, formatDateTime } from "./enquiry.view-utils";
import type {
  EnquiryJob,
  EnquiryLookup,
  EnquiryMasterLookup,
  EnquiryPropertyPatch,
  EnquiryRecord
} from "./enquiry.types";

type EditableKey = keyof EnquiryPropertyPatch;

export function EnquiryProperties({
  record,
  mobile,
  users,
  listOptions,
  statuses,
  priorities,
  jobs,
  jobLoading,
  onStartJob,
  onStopJob
}: {
  record: EnquiryRecord;
  mobile: string | null;
  users: EnquiryLookup[];
  listOptions: EnquiryMasterLookup[];
  statuses: EnquiryMasterLookup[];
  priorities: EnquiryMasterLookup[];
  jobs: EnquiryJob[];
  jobLoading: boolean;
  onStartJob: () => void;
  onStopJob: (id: number) => void;
}) {
  const client = useQueryClient();
  const createMaster = useEnquiryMasterCreate();
  const [editing, setEditing] = useState<EditableKey | null>(null);
  const [draft, setDraft] = useState<EnquiryPropertyPatch>({});
  const running = jobs.find((job) => job.status === "running");
  const update = useMutation({
    mutationFn: (patch: EnquiryPropertyPatch) => updateEnquiryProperties(record.id, patch),
    onSuccess: async () => {
      setEditing(null);
      setDraft({});
      await Promise.all([
        client.invalidateQueries({ queryKey: enquiryDetailQueryKey(record.id) }),
        client.invalidateQueries({ queryKey: enquiriesQueryKey }),
        client.invalidateQueries({ queryKey: enquiryActivityQueryKey(record.id) }),
        client.invalidateQueries({ queryKey: enquiryAttentionQueryKey })
      ]);
      toast.success("Enquiry properties updated");
    },
    onError: (error) => toast.error("Unable to update properties", { description: error.message })
  });

  useEffect(() => {
    setEditing(null);
    setDraft({});
  }, [record.id]);

  function edit(key: EditableKey) {
    setEditing(key);
    setDraft(
      key === "statusId"
        ? { statusId: record.statusId, closedReason: record.closedReason }
        : { [key]: record[key] }
    );
  }

  function save(key: EditableKey) {
    if ((key === "priorityId" || key === "statusId") && !draft[key]) {
      toast.error(`Choose a ${key === "priorityId" ? "priority" : "status"}.`);
      return;
    }
    if (key === "statusId") {
      if (!draft.statusId) return;
      const code = statuses.find((item) => item.id === draft.statusId)?.code;
      if (["won", "lost", "closed"].includes(code ?? "") && !draft.closedReason?.trim()) {
        toast.error("Enter an outcome reason before closing this enquiry.");
        return;
      }
      update.mutate({ statusId: draft.statusId, closedReason: draft.closedReason ?? null });
      return;
    }
    update.mutate({ [key]: draft[key] });
  }

  return (
    <aside className="space-y-4 xl:sticky xl:top-4">
      <WorkspaceShowCard title="Properties">
        <EditableRow
          label="List in"
          value={record.listIn || "—"}
          editing={editing === "listInId"}
          loading={update.isPending}
          onEdit={() => edit("listInId")}
          onCancel={() => setEditing(null)}
          onSave={() => save("listInId")}
        >
          <WorkspaceLookup
            allowTextValue={false}
            createMode="inline"
            createLabel="Create List In"
            showCreateWhenEmpty
            showAllOptionsOnFocus
            options={listOptions
              .filter((item) => item.status === "active")
              .map((item) => ({ value: String(item.id), label: item.name }))}
            placeholder="Choose list"
            value={draft.listInId ? String(draft.listInId) : ""}
            onCreate={createMaster.listIn}
            onTextChange={() => setDraft({ listInId: null })}
            onValueChange={(value) => setDraft({ listInId: value ? Number(value) : null })}
          />
        </EditableRow>
        <EditableRow
          label="Priority"
          value={
            <CrmColorLabel kind="priority" code={record.priority} label={record.priorityName} />
          }
          editing={editing === "priorityId"}
          loading={update.isPending}
          onEdit={() => edit("priorityId")}
          onCancel={() => setEditing(null)}
          onSave={() => save("priorityId")}
        >
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
            value={draft.priorityId ? String(draft.priorityId) : ""}
            onCreate={createMaster.priority}
            onTextChange={() => setDraft({ priorityId: 0 })}
            onValueChange={(value) => setDraft({ priorityId: Number(value) })}
          />
        </EditableRow>
        <EditableRow
          label="Assigned to"
          value={users.find((user) => user.id === record.assignedUserId)?.name ?? "Unassigned"}
          editing={editing === "assignedUserId"}
          loading={update.isPending}
          onEdit={() => edit("assignedUserId")}
          onCancel={() => setEditing(null)}
          onSave={() => save("assignedUserId")}
        >
          <WorkspaceLookup
            allowTextValue={false}
            showAllOptionsOnFocus
            options={users.map((user) => ({ value: String(user.id), label: user.name }))}
            placeholder="Unassigned"
            value={draft.assignedUserId ? String(draft.assignedUserId) : ""}
            onValueChange={(value) => setDraft({ assignedUserId: value ? Number(value) : null })}
          />
        </EditableRow>
        <EditableRow
          label="Schedule date"
          value={formatDate(record.dueDate)}
          editing={editing === "dueDate"}
          loading={update.isPending}
          onEdit={() => edit("dueDate")}
          onCancel={() => setEditing(null)}
          onSave={() => save("dueDate")}
        >
          <WorkspaceDatePicker
            ariaLabel="Enquiry schedule date"
            placeholder="Select date"
            value={draft.dueDate ?? ""}
            onValueChange={(value) => setDraft({ dueDate: value || null })}
          />
        </EditableRow>
        <div className="border-b border-border/70 p-3">
          <Button
            className="w-full"
            disabled={jobLoading}
            type="button"
            variant="secondary"
            onClick={() => (running ? onStopJob(running.id) : onStartJob())}
          >
            <Timer className="size-4" />{" "}
            {running ? `Stop job · ${elapsed(running.startAt)}` : "Start job"}
          </Button>
        </div>
        <EditableRow
          label="Status"
          value={<CrmColorLabel kind="status" code={record.status} label={record.statusName} />}
          editing={editing === "statusId"}
          loading={update.isPending}
          onEdit={() => edit("statusId")}
          onCancel={() => setEditing(null)}
          onSave={() => save("statusId")}
        >
          <div className="space-y-2">
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
              value={draft.statusId ? String(draft.statusId) : ""}
              onCreate={createMaster.status}
              onTextChange={() => setDraft({ statusId: 0 })}
              onValueChange={(value) => setDraft({ ...draft, statusId: Number(value) })}
            />
            {["won", "lost", "closed"].includes(
              statuses.find((item) => item.id === draft.statusId)?.code ?? ""
            ) ? (
              <Textarea
                aria-label="Outcome reason"
                placeholder="Outcome reason"
                value={draft.closedReason ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, closedReason: event.target.value }))
                }
              />
            ) : null}
          </div>
        </EditableRow>
        {record.closedReason ? (
          <WorkspaceDetailTable rows={[["Outcome reason", record.closedReason]]} />
        ) : null}
        <WorkspaceDetailTable rows={[["Updated", formatDateTime(record.updatedAt)]]} />
      </WorkspaceShowCard>
      <WorkspaceShowCard title="Customer">
        <WorkspaceDetailTable
          rows={[
            ["Customer", record.contactName ?? record.capturedName ?? "—"],
            ["Mobile", mobile || "—"],
            ["Enquiry date", formatDate(record.enquiredAt)],
            ["Schedule date", formatDate(record.dueDate)]
          ]}
        />
      </WorkspaceShowCard>
    </aside>
  );
}

function EditableRow({
  label,
  value,
  editing,
  loading,
  children,
  onEdit,
  onCancel,
  onSave
}: {
  label: string;
  value: ReactNode;
  editing: boolean;
  loading: boolean;
  children: ReactNode;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div
      className="border-b border-border/70 text-sm"
      style={{ display: "grid", gridTemplateColumns: "9rem minmax(0, 1fr)" }}
    >
      <div className="bg-muted/30 px-3 py-3 text-xs uppercase text-muted-foreground">{label}</div>
      <div className="flex min-w-0 items-center gap-1 px-2 py-1.5">
        {editing ? (
          <>
            <div className="min-w-0 flex-1">{children}</div>
            <Button
              aria-label={`Save ${label}`}
              className="size-8 shrink-0"
              disabled={loading}
              size="icon"
              type="button"
              onClick={onSave}
            >
              <Check className="size-4" />
            </Button>
            <Button
              aria-label={`Cancel editing ${label}`}
              className="size-8 shrink-0"
              disabled={loading}
              size="icon"
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              <X className="size-4" />
            </Button>
          </>
        ) : (
          <>
            <span className="min-w-0 flex-1 truncate font-medium">{value}</span>
            <Button
              aria-label={`Edit ${label}`}
              className="size-8 shrink-0"
              size="icon"
              type="button"
              variant="ghost"
              onClick={onEdit}
            >
              <Pencil className="size-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function elapsed(startAt: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(startAt)) / 1000));
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
