import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactemploymentsKey, useContactEmployments } from "./contact-employments.hooks";
import {
  saveContactEmployments,
  setContactEmploymentsActive
} from "./contact-employments.services";
import type {
  ContactEmploymentsInput,
  ContactEmploymentsRecord
} from "./contact-employments.types";

const empty = (parentId: number): ContactEmploymentsInput => ({
  personId: parentId,
  jobTitle: null,
  department: null,
  seniority: null,
  workLocation: null,
  employmentStatus: null,
  joiningDate: null,
  endDate: null
});

export function ContactEmploymentsSection({ parentId, onSaved }: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactEmployments(parentId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactEmploymentsInput>(() => empty(parentId));
  const records = query.data ?? [];
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const set = <Key extends keyof ContactEmploymentsInput>(
    key: Key,
    value: ContactEmploymentsInput[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setSelectedId(null);
    setForm(empty(parentId));
  }, [parentId]);
  const mutation = useMutation({
    mutationFn: (input: ContactEmploymentsInput) => saveContactEmployments(input, selectedId),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: contactemploymentsKey });
      setSelectedId(record.id);
      setForm(record);
      onSaved?.();
      toast.success("Employment saved");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  const toggle = useMutation({
    mutationFn: (record: ContactEmploymentsRecord) =>
      setContactEmploymentsActive(record.id, record.status !== "active"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactemploymentsKey });
      onSaved?.();
    },
    onError: (error) => toast.error("Unable to change status", { description: error.message })
  });
  function select(record: ContactEmploymentsRecord | null) {
    setSelectedId(record?.id ?? null);
    setForm(record ?? empty(parentId));
  }
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
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="font-semibold">Employment</h3>
          <Button size="sm" variant="outline" onClick={() => select(null)}>
            New
          </Button>
        </div>
        {query.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">No records yet.</p>
        ) : null}
        <div className="space-y-1">
          {records.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => select(item)}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${item.id === selectedId ? "bg-accent" : "hover:bg-muted"}`}
            >
              <span className="block truncate font-medium">
                {String(item.jobTitle ?? "Record #" + item.id)}
              </span>
              <span className="text-xs text-muted-foreground">{item.status}</span>
            </button>
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
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{selected ? "Edit" : "New"} employment</h3>
          {selected ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={toggle.isPending}
              onClick={() => toggle.mutate(selected)}
            >
              {selected.status === "active" ? "Deactivate" : "Activate"}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block space-y-1 text-sm font-medium">
            Job Title
            <Input
              type="text"
              value={form.jobTitle ?? ""}
              required={false}
              onChange={(event) => set("jobTitle", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Department
            <Input
              type="text"
              value={form.department ?? ""}
              required={false}
              onChange={(event) => set("department", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Seniority
            <Input
              type="text"
              value={form.seniority ?? ""}
              required={false}
              onChange={(event) => set("seniority", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Work Location
            <Input
              type="text"
              value={form.workLocation ?? ""}
              required={false}
              onChange={(event) => set("workLocation", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Employment Status
            <Input
              type="text"
              value={form.employmentStatus ?? ""}
              required={false}
              onChange={(event) => set("employmentStatus", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Joining Date
            <Input
              type="date"
              value={form.joiningDate ?? ""}
              required={false}
              onChange={(event) => set("joiningDate", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            End Date
            <Input
              type="date"
              value={form.endDate ?? ""}
              required={false}
              onChange={(event) => set("endDate", event.target.value || null)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
