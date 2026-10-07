import { BarChart3, Clock3, MessageSquare, PhoneCall } from "lucide-react";
import { Button } from "@cxsun/ui/components/button";
import { Card } from "@cxsun/ui/components/card";
import {
  useEnquirySummary,
  useEnquiryOverviewActivity,
  useEnquiryAttention,
  countEnquiryStatuses
} from "../enquiry/index";
import type { EnquiryMasterLookup } from "../enquiry/index";
import { useStatus } from "../status/index";

export function CrmOverviewWorkspace({
  currentUserName,
  onOpenMyJob,
  onOpenMyCalls
}: {
  currentUserEmail: string;
  currentUserName: string;
  onOpenMyJob: () => void;
  onOpenMyCalls: () => void;
}) {
  const summary = useEnquirySummary();
  const activity = useEnquiryOverviewActivity();
  const followUps = useEnquiryAttention();
  const statuses = useStatus();
  const jobs = summary.data?.assigned;
  const calls = summary.data?.created;
  const newJobs = jobs?.newCalls ?? 0;
  const attention = jobs?.attention ?? 0;
  const activeJobs = jobs?.active ?? 0;
  const activeCalls = calls?.active ?? 0;
  return (
    <section className="mx-auto max-w-6xl space-y-7 pb-10">
      <div>
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="mt-1 text-3xl font-semibold">{currentUserName}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {newJobs} new {newJobs === 1 ? "call needs" : "calls need"} your attention.
        </p>
      </div>
      {summary.error || activity.error || followUps.error ? (
        <p className="text-sm text-destructive" role="alert">
          {summary.error?.message ?? activity.error?.message ?? followUps.error?.message}
        </p>
      ) : null}
      {followUps.data?.assignments.length || followUps.data?.due.length ? (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-amber-300 p-4">
          <span>
            {followUps.data.assignments.length} new assignments ·{" "}
            {
              followUps.data.due.filter((record) => record.dueDate && record.dueDate < localToday())
                .length
            }{" "}
            overdue ·{" "}
            {followUps.data.due.filter((record) => record.dueDate === localToday()).length} due
            today
          </span>
          <Button variant="outline" onClick={onOpenMyJob}>
            Review follow-ups
          </Button>
        </Card>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="New to open" value={newJobs} tone="border-l-sky-500" />
        <Metric label="Needs attention" value={attention} tone="border-l-amber-500" />
        <Metric label="Active follow-ups" value={activeJobs} tone="border-l-blue-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle icon={BarChart3} title="Priority focus" />
          {priorityCounts(jobs?.priorityCounts ?? []).map(({ label, count, color }) => (
            <div className="mt-4" key={label}>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <strong>{count}</strong>
              </div>
              <div className="mt-1 h-2 rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${color}`}
                  style={{ width: `${activeJobs ? (count / activeJobs) * 100 : 0}%` }}
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
              ["Updated this week", jobs?.updated7 ?? 0],
              ["Created in 7 days", jobs?.created7 ?? 0],
              ["Created in 30 days", jobs?.created30 ?? 0]
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
              ["Calls updated, 30 days", jobs?.updated30 ?? 0]
            ]}
          />
        </Card>
        <Card className="p-5">
          <SectionTitle icon={PhoneCall} title="My Calls at a glance" />
          <MetricGrid
            items={[
              ["Created by you", calls?.total ?? 0],
              ["Active", activeCalls],
              ["In progress", countEnquiryStatuses(calls?.statusCounts ?? [], "in-progress")],
              ["Oldest active call", oldestDays(calls?.oldestActiveDays)]
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
                  {countEnquiryStatuses(jobs?.statusCounts ?? [], filter)}
                </td>
                <td className="px-4 py-3 text-center">
                  {countEnquiryStatuses(calls?.statusCounts ?? [], filter)}
                </td>
              </tr>
            ))}
            <tr className="border-t bg-muted/30">
              <th className="px-4 py-3 text-left">Oldest active call</th>
              <td className="px-4 py-3 text-center">{oldestDays(jobs?.oldestActiveDays)}</td>
              <td className="px-4 py-3 text-center">{oldestDays(calls?.oldestActiveDays)}</td>
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
function priorityCounts(counts: Array<{ code: string; count: number }>) {
  return [
    { label: "Urgent", code: "urgent", color: "bg-rose-500" },
    { label: "High", code: "high", color: "bg-amber-500" },
    { label: "Normal", code: "normal", color: "bg-teal-500" },
    { label: "Low", code: "low", color: "bg-sky-500" }
  ]
    .map((item) => ({
      ...item,
      count: counts.find((entry) => entry.code === item.code)?.count ?? 0
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
function oldestDays(days: number | null | undefined) {
  return days === null || days === undefined ? "—" : `${days} days`;
}
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
