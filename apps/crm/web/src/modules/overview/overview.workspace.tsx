import { ArrowUpRight, BarChart3, Clock3, MessageSquare, PhoneCall } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import { useEnquiries, useEnquiryOverviewActivity, useEnquiryUsers } from "../enquiry/index";
import {
  enquiryAgeDays,
  enquiryInScope,
  isActiveEnquiry,
  matchesEnquiryFilter
} from "../enquiry/index";
import type { EnquiryMasterLookup, EnquiryRecord } from "../enquiry/index";
import { useStatus } from "../status/index";

export function CrmOverviewWorkspace({
  currentUserEmail,
  currentUserName,
  onOpenMyJob,
  onOpenMyCalls
}: {
  currentUserEmail: string;
  currentUserName: string;
  onOpenMyJob: () => void;
  onOpenMyCalls: () => void;
}) {
  const enquiries = useEnquiries();
  const users = useEnquiryUsers();
  const activity = useEnquiryOverviewActivity();
  const statuses = useStatus();
  const userId =
    users.data?.find((user) => user.email?.toLowerCase() === currentUserEmail.toLowerCase())?.id ??
    null;
  const all = enquiries.data ?? [];
  const jobs = all.filter((record) => enquiryInScope(record, "assigned", userId, currentUserEmail));
  const calls = all.filter((record) => enquiryInScope(record, "created", userId, currentUserEmail));
  const newJobs = jobs.filter((record) => record.status === "new").length;
  const attention = jobs.filter(
    (record) => isActiveEnquiry(record) && (record.priority === "urgent" || overdue(record))
  ).length;
  const activeJobs = jobs.filter(isActiveEnquiry);
  const activeCalls = calls.filter(isActiveEnquiry);
  return (
    <section className="mx-auto max-w-6xl space-y-7 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back</p>
          <h1 className="mt-1 text-3xl font-semibold">{currentUserName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {newJobs} new {newJobs === 1 ? "call needs" : "calls need"} your attention.
          </p>
        </div>
        <Button onClick={onOpenMyJob} variant="outline">
          Open new jobs <ArrowUpRight className="size-4" />
        </Button>
      </div>
      {enquiries.error || users.error || activity.error ? (
        <p className="text-sm text-destructive" role="alert">
          {enquiries.error?.message ?? users.error?.message ?? activity.error?.message}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="New to open" value={newJobs} tone="border-l-sky-500" />
        <Metric label="Needs attention" value={attention} tone="border-l-amber-500" />
        <Metric label="Active follow-ups" value={activeJobs.length} tone="border-l-blue-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle icon={BarChart3} title="Priority focus" />
          {priorityCounts(activeJobs).map(({ label, count, color }) => (
            <div className="mt-4" key={label}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <strong>{count}</strong>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${activeJobs.length ? (count / activeJobs.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </Card>
        <Card className="p-5">
          <SectionTitle icon={Clock3} title="Attention and activity" />
          <MetricGrid
            items={[
              ["Needs attention", attention],
              [
                "Updated this week",
                jobs.filter((record) => withinDays(record.updatedAt, 7)).length
              ],
              [
                "Created in 7 days",
                jobs.filter((record) => withinDays(record.createdAt, 7)).length
              ],
              [
                "Created in 30 days",
                jobs.filter((record) => withinDays(record.createdAt, 30)).length
              ]
            ]}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle icon={MessageSquare} title="Your call activity" />
          <MetricGrid
            items={[
              ["Your reactions, 7 days", "—"],
              ["Your reactions, 30 days", "—"],
              ["Comments by you, 30 days", activity.data?.commentsByYou30Days ?? "—"],
              [
                "Calls updated, 30 days",
                jobs.filter((record) => withinDays(record.updatedAt, 30)).length
              ]
            ]}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle icon={PhoneCall} title="My Calls at a glance" />
          <MetricGrid
            items={[
              ["Created by you", calls.length],
              ["Active", activeCalls.length],
              [
                "In progress",
                calls.filter((record) => matchesEnquiryFilter(record, "in-progress")).length
              ],
              ["Oldest active call", oldestDays(activeCalls)]
            ]}
          />
        </Card>
      </div>
      <div>
        <h2 className="text-lg font-semibold">Your work mix</h2>
        <p className="text-sm text-muted-foreground">
          What needs action, what is progressing, and what you have created.
        </p>
      </div>
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-center font-medium">My Job · assigned to me</th>
              <th className="px-4 py-3 text-center font-medium">My Calls · created by me</th>
            </tr>
          </thead>
          <tbody>
            {workMixRows(statuses.data ?? []).map(({ label, filter }) => (
              <tr className="border-t" key={label}>
                <th className="px-4 py-3 text-left font-medium">{label}</th>
                <td className="px-4 py-3 text-center">
                  {jobs.filter((record) => matchesEnquiryFilter(record, filter)).length}
                </td>
                <td className="px-4 py-3 text-center">
                  {calls.filter((record) => matchesEnquiryFilter(record, filter)).length}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30">
              <th className="px-4 py-3 text-left">Oldest active call</th>
              <td className="px-4 py-3 text-center">{oldestDays(activeJobs)}</td>
              <td className="px-4 py-3 text-center">{oldestDays(activeCalls)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex gap-2">
        <Button onClick={onOpenMyJob} variant="outline">
          My Job
        </Button>
        <Button onClick={onOpenMyCalls} variant="outline">
          My Calls
        </Button>
      </div>
    </section>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <Card className={`border-l-2 p-4 ${tone}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <strong className="mt-1 block text-xl">{value}</strong>
    </Card>
  );
}
function SectionTitle({ icon: Icon, title }: { icon: typeof BarChart3; title: string }) {
  return (
    <h2 className="flex items-center gap-2 font-semibold">
      <span className="rounded-md bg-muted p-2">
        <Icon className="size-4" />
      </span>
      {title}
    </h2>
  );
}
function MetricGrid({ items }: { items: Array<[string, number | string]> }) {
  return (
    <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-md border">
      {items.map(([label, value]) => (
        <div className="border-b border-r p-3" key={label}>
          <p className="text-xs text-muted-foreground">{label}</p>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}
function priorityCounts(records: EnquiryRecord[]) {
  return [
    { label: "Urgent", code: "urgent", color: "bg-rose-500" },
    { label: "High", code: "high", color: "bg-amber-500" },
    { label: "Normal", code: "normal", color: "bg-teal-500" },
    { label: "Low", code: "low", color: "bg-sky-500" }
  ]
    .map((item) => ({
      ...item,
      count: records.filter((record) => record.priority === item.code).length
    }))
    .filter((item) => item.count > 0);
}
function workMixRows(records: EnquiryMasterLookup[]) {
  const fixed = [
    { label: "All calls", filter: "all" },
    { label: "Active", filter: "active" },
    { label: "In progress", filter: "in-progress" }
  ];
  const statuses = records
    .filter((record) => record.status === "active")
    .map((record) => ({ label: record.name, filter: record.code ?? "" }));
  return [...fixed, ...statuses];
}
function oldestDays(records: EnquiryRecord[]) {
  return records.length
    ? `${Math.max(...records.map((record) => enquiryAgeDays(record)))} days`
    : "—";
}
function withinDays(value: string, days: number) {
  const elapsed = Date.now() - new Date(value).getTime();
  return elapsed >= 0 && elapsed < days * 86_400_000;
}
function overdue(record: EnquiryRecord) {
  return Boolean(record.dueDate && record.dueDate < new Date().toISOString().slice(0, 10));
}
