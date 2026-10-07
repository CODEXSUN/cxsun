import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { enquiryAttentionQueryKey, useEnquiryAttention } from "./enquiry.hooks";
import { readEnquiryAlert } from "./enquiry.services";

export function EnquiryAttention({ onOpen }: { onOpen: (id: number) => void }) {
  const client = useQueryClient();
  const attention = useEnquiryAttention();
  const read = useMutation({
    mutationFn: readEnquiryAlert,
    onSuccess: () => client.invalidateQueries({ queryKey: enquiryAttentionQueryKey }),
    onError: (error) => toast.error("Unable to dismiss assignment", { description: error.message })
  });
  const assignments = attention.data?.assignments ?? [];
  const due = attention.data?.due ?? [];
  if (!attention.error && assignments.length === 0 && due.length === 0) return null;
  const today = localToday();
  return (
    <section
      className="mb-4 rounded-md border border-amber-300 bg-amber-50/60 p-4 text-sm dark:bg-amber-950/20"
      aria-label="Enquiry attention"
    >
      <h2 className="mb-3 font-semibold">Your follow-ups</h2>
      {attention.error ? <p role="alert">{attention.error.message}</p> : null}
      {assignments.map((alert) => (
        <div className="flex flex-wrap items-center gap-2 py-1" key={alert.id}>
          <Bell className="size-4" />
          <button
            className="font-medium hover:underline"
            type="button"
            onClick={() => onOpen(alert.enquiryId)}
          >
            #{alert.enquiryNo} · {alert.title}
          </button>
          <span>assigned to you</span>
          <Button
            size="sm"
            type="button"
            variant="outline"
            disabled={read.isPending}
            onClick={() => read.mutate(alert.id)}
          >
            Dismiss
          </Button>
        </div>
      ))}
      {due.map((record) => (
        <div className="flex flex-wrap items-center gap-2 py-1" key={record.id}>
          <CalendarClock className="size-4" />
          <button
            className="font-medium hover:underline"
            type="button"
            onClick={() => onOpen(record.id)}
          >
            #{record.enquiryNo} · {record.title}
          </button>
          <span
            className={
              record.dueDate && record.dueDate < today ? "font-medium text-destructive" : ""
            }
          >
            {record.dueDate && record.dueDate < today ? "Overdue" : "Due today"} · {record.dueDate}
          </span>
        </div>
      ))}
      {due.length === 100 ? (
        <p className="mt-2 text-muted-foreground">Showing the first 100 due enquiries.</p>
      ) : null}
    </section>
  );
}

function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
