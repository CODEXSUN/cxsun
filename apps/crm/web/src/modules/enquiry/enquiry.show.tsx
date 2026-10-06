import { useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, MessageSquare, ReceiptText, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { WorkspaceAnimatedTabs } from "@cxsun/ui/workspace/animated-tabs";
import { WorkspacePage } from "@cxsun/ui/workspace/page";
import { WorkspaceShowLayout } from "@cxsun/ui/workspace/show";
import { WorkspaceStatusBadge } from "@cxsun/ui/workspace/status";
import { CrmColorLabel, CrmStatusBadge } from "../../crm-colors";
import { EnquiryActivityPanel } from "./enquiry.activity";
import { EnquiryComments } from "./enquiry.comments";
import { EnquiryEstimates } from "./enquiry.estimates";
import {
  enquiryActivityQueryKey,
  enquiryJobsQueryKey,
  useEnquiryActivity,
  useEnquiryComments,
  useEnquiryDetail,
  useEnquiryEstimates,
  useEnquiryJobs
} from "./enquiry.hooks";
import { EnquiryJobs } from "./enquiry.jobs";
import { EnquiryProperties } from "./enquiry.properties";
import { startEnquiryJob, stopEnquiryJob } from "./enquiry.services";
import { formatDateTime, whatsappUrl } from "./enquiry.view-utils";
import type { EnquiryLookup, EnquiryMasterLookup, EnquiryRecord } from "./enquiry.types";

type EnquiryTab = "comments" | "jobs" | "estimate" | "activity";

export function EnquiryShow({
  id,
  contacts,
  users,
  listOptions,
  statuses,
  priorities
}: {
  id: number;
  contacts: EnquiryLookup[];
  users: EnquiryLookup[];
  listOptions: EnquiryMasterLookup[];
  statuses: EnquiryMasterLookup[];
  priorities: EnquiryMasterLookup[];
}) {
  const client = useQueryClient();
  const [activeTab, setActiveTab] = useState<EnquiryTab>("comments");
  const enquiry = useEnquiryDetail(id);
  const comments = useEnquiryComments(id);
  const jobs = useEnquiryJobs(id);
  const estimates = useEnquiryEstimates(id);
  const activity = useEnquiryActivity(id);
  const record = enquiry.data;
  const contact = contacts.find((item) => item.id === record?.contactId);
  const mobile = contact?.primaryPhone || record?.capturedPhone || null;
  const whatsApp = whatsappUrl(mobile);
  const error = enquiry.error ?? comments.error ?? jobs.error ?? estimates.error ?? activity.error;
  const jobAction = useMutation({
    mutationFn: (jobId: number | null) => (jobId ? stopEnquiryJob(id, jobId) : startEnquiryJob(id)),
    onSuccess: async (job) => {
      await Promise.all([
        client.invalidateQueries({ queryKey: enquiryJobsQueryKey(id) }),
        client.invalidateQueries({ queryKey: enquiryActivityQueryKey(id) })
      ]);
      toast.success(job.status === "running" ? "Job started" : "Job stopped");
    },
    onError: (failure) => toast.error("Unable to update job", { description: failure.message })
  });
  const tabs = [
    {
      value: "comments",
      label: (
        <TabLabel
          icon={<MessageSquare className="size-4" />}
          label="Comments"
          count={comments.data?.filter((item) => !item.parentId).length ?? 0}
        />
      ),
      content: (
        <EnquiryComments
          enquiryId={id}
          comments={comments.data ?? []}
          loading={comments.isLoading}
        />
      )
    },
    {
      value: "jobs",
      label: (
        <TabLabel icon={<Timer className="size-4" />} label="Jobs" count={jobs.data?.length ?? 0} />
      ),
      content: (
        <EnquiryJobs
          enquiryId={id}
          jobs={jobs.data ?? []}
          users={users}
          loading={jobs.isLoading}
          jobLoading={jobAction.isPending}
          onStart={() => jobAction.mutate(null)}
          onStop={(jobId) => jobAction.mutate(jobId)}
        />
      )
    },
    {
      value: "estimate",
      label: <TabLabel icon={<ReceiptText className="size-4" />} label="Estimate" />,
      content: (
        <EnquiryEstimates
          enquiryId={id}
          estimates={estimates.data ?? []}
          contacts={contacts}
          loading={estimates.isLoading}
        />
      )
    },
    {
      value: "activity",
      label: <TabLabel icon={<Activity className="size-4" />} label="Activity" />,
      content: <EnquiryActivityPanel activity={activity.data ?? []} loading={activity.isLoading} />
    }
  ];
  return (
    <WorkspacePage
      className="!w-full !max-w-none px-1 lg:px-2"
      technicalName="page.crm.enquiry.show"
      title={record ? enquiryHeading(record, mobile) : "Enquiry"}
      actions={
        whatsApp ? (
          <Button asChild type="button">
            <a
              href={whatsApp}
              rel="noopener noreferrer"
              style={{ backgroundColor: "#25d366", color: "#fff" }}
              target="_blank"
            >
              <WhatsAppIcon /> WhatsApp
            </a>
          </Button>
        ) : (
          <Button
            disabled
            style={{ backgroundColor: "#25d366", color: "#fff" }}
            title="Add a valid mobile number to use WhatsApp"
            type="button"
          >
            <WhatsAppIcon /> WhatsApp
          </Button>
        )
      }
    >
      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {error.message}
          <Button
            className="ml-3"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => {
              void enquiry.refetch();
              void comments.refetch();
              void jobs.refetch();
              void estimates.refetch();
              void activity.refetch();
            }}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {!record ? (
        !error && <p className="text-sm text-muted-foreground">Loading enquiry…</p>
      ) : (
        <>
          <EnquirySummary record={record} />
          <WorkspaceShowLayout className="xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="min-w-0 overflow-hidden rounded-md border border-border/70 bg-card/95 shadow-sm">
              <WorkspaceAnimatedTabs
                tabs={tabs}
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as EnquiryTab)}
                listClassName="px-3"
                contentClassName="mt-0 pb-0"
              />
            </div>
            <EnquiryProperties
              record={record}
              mobile={mobile}
              users={users}
              listOptions={listOptions}
              statuses={statuses}
              priorities={priorities}
              jobs={jobs.data ?? []}
              jobLoading={jobAction.isPending}
              onStartJob={() => jobAction.mutate(null)}
              onStopJob={(jobId) => jobAction.mutate(jobId)}
            />
          </WorkspaceShowLayout>
        </>
      )}
    </WorkspacePage>
  );
}

function EnquirySummary({ record }: { record: EnquiryRecord }) {
  return (
    <section className="rounded-md border border-border/70 bg-card/95 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-xs text-muted-foreground">#{record.enquiryNo}</span>
          <h2 className="mt-1 break-words text-lg font-semibold">{record.title}</h2>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            <WorkspaceStatusBadge
              label={`List in · ${record.listIn || "Unlisted"}`}
              tone="info"
              showIcon={false}
            />
            <CrmStatusBadge code={record.status} label={record.statusName} />
            <span className="inline-flex h-6 items-center rounded-md border border-slate-200 bg-slate-50 px-2 text-[11px] font-medium text-slate-700">
              <CrmColorLabel kind="priority" code={record.priority} label={record.priorityName} />
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Created by {record.createdBy} · {formatDateTime(record.createdAt)}
          </p>
        </div>
      </div>
    </section>
  );
}

function TabLabel({ icon, label, count }: { icon: ReactNode; label: string; count?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      {icon}
      {label}
      {count !== undefined ? (
        <span className="rounded-full bg-muted px-1.5 text-xs text-foreground">{count}</span>
      ) : null}
    </span>
  );
}

function enquiryHeading(record: EnquiryRecord, mobile: string | null) {
  const customer = record.contactName ?? record.capturedName;
  return [`#${record.enquiryNo}`, mobile, customer !== mobile ? customer : null]
    .filter(Boolean)
    .join(" · ");
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" className="size-4 fill-current" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.876 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.262.489 1.693.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.002-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.99c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.14 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}
