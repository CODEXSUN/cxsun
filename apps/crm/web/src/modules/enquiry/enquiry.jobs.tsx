import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import { WorkspaceLookup } from "@cxsun/ui/workspace/lookup";
import { WorkspaceSelect } from "@cxsun/ui/workspace/select";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { WorkspaceTableEmptyState } from "@cxsun/ui/workspace/table";
import {
  WorkspaceFormBanner,
  WorkspaceFormField,
  WorkspaceFormFooter,
  WorkspaceUpsertDialog
} from "@cxsun/ui/workspace/upsert";
import { createEnquiryJob, updateEnquiryJob } from "./enquiry.services";
import { enquiryActivityQueryKey, enquiryJobsQueryKey } from "./enquiry.hooks";
import { formatDateTime } from "./enquiry.view-utils";
import type {
  EnquiryJob,
  EnquiryJobSavePayload,
  EnquiryJobStatus,
  EnquiryLookup
} from "./enquiry.types";

export function EnquiryJobs({
  enquiryId,
  jobs,
  users,
  loading,
  jobLoading,
  onStart,
  onStop
}: {
  enquiryId: number;
  jobs: EnquiryJob[];
  users: EnquiryLookup[];
  loading: boolean;
  jobLoading: boolean;
  onStart: () => void;
  onStop: (jobId: number) => void;
}) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<EnquiryJob | null | undefined>(undefined);
  const running = jobs.find((job) => job.status === "running");
  const save = useMutation({
    mutationFn: (input: EnquiryJobSavePayload) =>
      editing ? updateEnquiryJob(enquiryId, editing.id, input) : createEnquiryJob(enquiryId, input),
    onSuccess: async () => {
      setEditing(undefined);
      await Promise.all([
        client.invalidateQueries({ queryKey: enquiryJobsQueryKey(enquiryId) }),
        client.invalidateQueries({ queryKey: enquiryActivityQueryKey(enquiryId) })
      ]);
      toast.success("Job saved");
    },
    onError: (error) => toast.error("Unable to save job", { description: error.message })
  });
  return (
    <section className="min-h-[34rem] bg-card p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Time recorded against this enquiry.</p>
        <div className="flex gap-2">
          <Button
            disabled={jobLoading}
            type="button"
            variant="secondary"
            onClick={() => (running ? onStop(running.id) : onStart())}
          >
            <Timer className="size-4" /> {running ? "Stop job" : "Start job"}
          </Button>
          <Button type="button" onClick={() => setEditing(null)}>
            <Plus className="size-4" /> New job
          </Button>
        </div>
      </div>
      {loading ? <p className="text-sm text-muted-foreground">Loading jobs…</p> : null}
      <div className="overflow-x-auto rounded-md border border-border/70">
        <table className="w-full min-w-[750px] text-left text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              {[
                "Job",
                "Employee",
                "Start",
                "Stop",
                "Hours",
                "Rate/hr",
                "Cost",
                "Status",
                "Action"
              ].map((label) => (
                <th className="px-3 py-2" key={label}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr className="border-t border-border/70" key={job.id}>
                <td className="px-3 py-2 font-medium">#{job.id}</td>
                <td className="px-3 py-2">{job.employee}</td>
                <td className="px-3 py-2">{formatDateTime(job.startAt)}</td>
                <td className="px-3 py-2">{job.stopAt ? formatDateTime(job.stopAt) : "—"}</td>
                <td className="px-3 py-2">{(job.durationSeconds / 3600).toFixed(2)}</td>
                <td className="px-3 py-2">₹{job.ratePerHour.toFixed(2)}</td>
                <td className="px-3 py-2">₹{job.totalCost.toFixed(2)}</td>
                <td className="px-3 py-2">
                  <WorkspaceStatusBadge
                    label={job.status}
                    tone={
                      job.status === "completed"
                        ? "success"
                        : job.status === "running"
                          ? "warning"
                          : "neutral"
                    }
                  />
                </td>
                <td className="px-3 py-2">
                  <Button size="sm" type="button" variant="ghost" onClick={() => setEditing(job)}>
                    Edit
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && jobs.length === 0 ? (
          <WorkspaceTableEmptyState>No jobs have been recorded.</WorkspaceTableEmptyState>
        ) : null}
      </div>
      {editing !== undefined ? (
        <JobDialog
          key={editing?.id ?? "new"}
          record={editing}
          users={users}
          loading={save.isPending}
          error={save.error?.message ?? ""}
          onClose={() => setEditing(undefined)}
          onSave={(input) => save.mutate(input)}
        />
      ) : null}
    </section>
  );
}

function JobDialog({
  record,
  users,
  loading,
  error,
  onClose,
  onSave
}: {
  record: EnquiryJob | null;
  users: EnquiryLookup[];
  loading: boolean;
  error: string;
  onClose: () => void;
  onSave: (input: EnquiryJobSavePayload) => void;
}) {
  const [employee, setEmployee] = useState(
    record?.employeeUserId ? String(record.employeeUserId) : ""
  );
  const [startAt, setStartAt] = useState(localDateTime(record?.startAt));
  const [stopAt, setStopAt] = useState(localDateTime(record?.stopAt));
  const [rate, setRate] = useState(String(record?.ratePerHour ?? 0));
  const [status, setStatus] = useState<EnquiryJobStatus>(record?.status ?? "completed");
  const [issue, setIssue] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!employee || !startAt || (status !== "running" && !stopAt)) {
      setIssue("Enter an employee, start time, and a stop time when the job is complete.");
      return;
    }
    const start = new Date(startAt).toISOString();
    const stop = status === "running" ? null : new Date(stopAt).toISOString();
    if (stop && Date.parse(stop) < Date.parse(start)) {
      setIssue("Stop time must be after start time.");
      return;
    }
    onSave({
      employeeUserId: Number(employee),
      startAt: start,
      stopAt: stop,
      ratePerHour: Number(rate),
      status
    });
  }

  return (
    <WorkspaceUpsertDialog
      title={record ? `Edit job #${record.id}` : "New job"}
      description="Record time and cost against this enquiry."
      open
      onClose={onClose}
    >
      <form className="space-y-4" noValidate onSubmit={submit}>
        {issue || error ? (
          <WorkspaceFormBanner title="Unable to save job">{issue || error}</WorkspaceFormBanner>
        ) : null}
        <WorkspaceFormField label="Employee" required>
          <WorkspaceLookup
            allowTextValue={false}
            required
            showAllOptionsOnFocus
            options={users.map((user) => ({ value: String(user.id), label: user.name }))}
            placeholder="Search employee"
            value={employee}
            onValueChange={setEmployee}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Start time" required>
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Stop time" required={status !== "running"}>
          <Input
            disabled={status === "running"}
            type="datetime-local"
            value={stopAt}
            onChange={(event) => setStopAt(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Rate/hr" required>
          <Input
            min="0"
            step="0.01"
            type="number"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </WorkspaceFormField>
        <WorkspaceFormField label="Status" required>
          <WorkspaceSelect
            options={[
              { label: "Running", value: "running" },
              { label: "Completed", value: "completed" },
              { label: "Cancelled", value: "cancelled" }
            ]}
            value={status}
            onValueChange={(value) => setStatus(value as EnquiryJobStatus)}
          />
        </WorkspaceFormField>
        <WorkspaceFormFooter onCancel={onClose} primaryLabel="Save job" primaryLoading={loading} />
      </form>
    </WorkspaceUpsertDialog>
  );
}

function localDateTime(value?: string | null) {
  const date = value ? new Date(value) : new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
