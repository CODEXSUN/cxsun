import { CircleCheck } from "lucide-react";

const prioritySwatches: Record<string, string> = {
  low: "bg-sky-500",
  normal: "bg-teal-500",
  high: "bg-orange-500",
  urgent: "bg-rose-500"
};

const statusBadges: Record<string, string> = {
  new: "border-blue-600 bg-blue-600 text-white",
  open: "border-sky-500 bg-sky-500 text-slate-950",
  won: "border-emerald-500 bg-emerald-500 text-slate-950",
  lost: "border-red-600 bg-red-600 text-white",
  "hold-for-approval": "border-amber-500 bg-amber-500 text-slate-950",
  "long-hold": "border-violet-600 bg-violet-600 text-white",
  "hold-for-spares": "border-orange-500 bg-orange-500 text-slate-950",
  closed: "border-slate-600 bg-slate-600 text-white",
  "hold-for-job-out": "border-amber-500 bg-amber-500 text-slate-950",
  escalation: "border-rose-600 bg-rose-600 text-white",
  reopen: "border-blue-600 bg-blue-600 text-white",
  contacted: "border-sky-500 bg-sky-500 text-slate-950",
  qualified: "border-emerald-500 bg-emerald-500 text-slate-950",
  unqualified: "border-slate-600 bg-slate-600 text-white"
};

const statusIconColors: Record<string, string> = {
  new: "text-blue-600",
  open: "text-sky-500",
  won: "text-emerald-500",
  lost: "text-red-600",
  "hold-for-approval": "text-amber-500",
  "long-hold": "text-violet-600",
  "hold-for-spares": "text-orange-500",
  closed: "text-slate-600",
  "hold-for-job-out": "text-amber-500",
  escalation: "text-rose-600",
  reopen: "text-blue-600",
  contacted: "text-sky-500",
  qualified: "text-emerald-500",
  unqualified: "text-slate-600"
};

export function prioritySwatch(code: string) {
  return prioritySwatches[code] ?? "bg-slate-500";
}

export function statusIcon(code: string) {
  return <CircleCheck className={`size-4 ${statusIconColors[code] ?? "text-slate-600"}`} />;
}

export function CrmStatusBadge({ code, label }: { code: string; label: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] font-medium ${statusBadges[code] ?? "border-slate-600 bg-slate-600 text-white"}`}
    >
      <CircleCheck aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}

export function CrmColorLabel({
  code,
  kind,
  label
}: {
  code: string;
  kind: "priority" | "status";
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      {kind === "status" ? (
        <span aria-hidden="true">{statusIcon(code)}</span>
      ) : (
        <span
          aria-hidden="true"
          className={`size-2.5 shrink-0 rounded-full ${prioritySwatch(code)}`}
        />
      )}
      {label}
    </span>
  );
}
