import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@cxsun/ui/components/input";
import { Textarea } from "@cxsun/ui/components/textarea";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactlifecycleKey, useContactLifecycle } from "./contact-lifecycle.hooks";
import { saveContactLifecycle } from "./contact-lifecycle.services";
import type { ContactLifecycleInput } from "./contact-lifecycle.types";

const empty = (parentId: number): ContactLifecycleInput => ({
  personId: parentId,
  previousStatus: null,
  newStatus: "",
  reason: null,
  effectiveAt: null
});

export function ContactLifecycleSection({ parentId, onSaved }: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactLifecycle(parentId);
  const [form, setForm] = useState<ContactLifecycleInput>(() => empty(parentId));
  const records = query.data ?? [];
  const currentStatus = records[0]?.newStatus ?? "No status recorded";
  const set = <Key extends keyof ContactLifecycleInput>(
    key: Key,
    value: ContactLifecycleInput[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setForm(empty(parentId));
  }, [parentId]);
  const mutation = useMutation({
    mutationFn: (input: ContactLifecycleInput) => saveContactLifecycle(input, null),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactlifecycleKey });
      setForm(empty(parentId));
      onSaved?.();
      toast.success("Lifecycle event recorded");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  if (query.isError)
    return (
      <div className="rounded-lg border p-6 text-sm text-destructive">
        Unable to load records.{" "}
        <button type="button" className="underline" onClick={() => void query.refetch()}>
          Retry
        </button>
      </div>
    );
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(14rem,0.34fr)_minmax(0,1fr)]">
      <div className="rounded-lg border bg-card p-3">
        <h3 className="font-semibold">Lifecycle history</h3>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">Current: {currentStatus}</p>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        ) : null}
        <div className="space-y-1">
          {records.map((item) => (
            <div key={item.id} className="rounded-md border px-3 py-2 text-sm">
              <span className="block font-medium">
                {item.previousStatus ?? "Start"} → {item.newStatus}
              </span>
              <span className="text-xs text-muted-foreground">
                {item.effectiveAt ?? item.createdAt.slice(0, 10)} · {item.reason ?? "No reason"}
              </span>
            </div>
          ))}
        </div>
      </div>
      <form
        id="contact360-active-form"
        className="space-y-5 rounded-lg border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate(form);
        }}
      >
        <h3 className="font-semibold">New lifecycle event</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm font-medium">
            New Status *
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.newStatus}
              required
              onChange={(event) => set("newStatus", event.target.value)}
            >
              <option value="">Select status</option>
              <option>Prospect</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Former</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Reason
            <Textarea
              value={form.reason ?? ""}
              required={false}
              onChange={(event) => set("reason", event.target.value)}
              rows={4}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Effective At
            <Input
              type="date"
              value={form.effectiveAt ?? ""}
              required={false}
              onChange={(event) => set("effectiveAt", event.target.value || null)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
