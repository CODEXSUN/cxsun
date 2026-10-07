import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@cxsun/ui/components/button";
import { Input } from "@cxsun/ui/components/input";
import type { Contact360LeafProps } from "../contact-360/contact-360.types";
import { contactpreferencesKey, useContactPreferences } from "./contact-preferences.hooks";
import {
  saveContactPreferences,
  setContactPreferencesActive
} from "./contact-preferences.services";
import type {
  ContactPreferencesInput,
  ContactPreferencesRecord
} from "./contact-preferences.types";

const empty = (parentId: number): ContactPreferencesInput => ({
  personId: parentId,
  preferredChannel: null,
  preferredLanguage: null,
  preferredTime: null,
  communicationFrequency: null,
  communicationPermission: null
});

export function ContactPreferencesSection({ parentId, onSaved }: Contact360LeafProps) {
  const client = useQueryClient();
  const query = useContactPreferences(parentId);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<ContactPreferencesInput>(() => empty(parentId));
  const records = query.data ?? [];
  const selected = records.find((item) => item.id === selectedId) ?? null;
  const set = <Key extends keyof ContactPreferencesInput>(
    key: Key,
    value: ContactPreferencesInput[Key]
  ) => setForm((current) => ({ ...current, [key]: value }));
  useEffect(() => {
    setSelectedId(null);
    setForm(empty(parentId));
  }, [parentId]);
  useEffect(() => {
    const first = records[0];
    if (first && selectedId === null) {
      setSelectedId(first.id);
      setForm(first);
    }
  }, [records, selectedId]);
  const mutation = useMutation({
    mutationFn: (input: ContactPreferencesInput) => saveContactPreferences(input, selectedId),
    onSuccess: async (record) => {
      await client.invalidateQueries({ queryKey: contactpreferencesKey });
      setSelectedId(record.id);
      setForm(record);
      onSaved?.();
      toast.success("Preferences saved");
    },
    onError: (error) => toast.error("Unable to save", { description: error.message })
  });
  const toggle = useMutation({
    mutationFn: (record: ContactPreferencesRecord) =>
      setContactPreferencesActive(record.id, record.status !== "active"),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: contactpreferencesKey });
      onSaved?.();
    },
    onError: (error) => toast.error("Unable to change status", { description: error.message })
  });
  function select(record: ContactPreferencesRecord | null) {
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
          <h3 className="font-semibold">Preferences</h3>
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
                {String(item.preferredChannel ?? "Record #" + item.id)}
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
          <h3 className="font-semibold">{selected ? "Edit" : "New"} preferences</h3>
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
            Preferred Channel
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.preferredChannel ?? ""}
              onChange={(event) => set("preferredChannel", event.target.value || null)}
            >
              <option value="">No preference</option>
              <option>Phone</option>
              <option>WhatsApp</option>
              <option>Email</option>
              <option>In person</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Preferred Language
            <Input
              type="text"
              value={form.preferredLanguage ?? ""}
              required={false}
              onChange={(event) => set("preferredLanguage", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Preferred Time
            <Input
              type="text"
              value={form.preferredTime ?? ""}
              required={false}
              onChange={(event) => set("preferredTime", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Communication Frequency
            <Input
              type="text"
              value={form.communicationFrequency ?? ""}
              required={false}
              onChange={(event) => set("communicationFrequency", event.target.value || null)}
            />
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Communication Permission
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3"
              value={form.communicationPermission ?? ""}
              onChange={(event) => set("communicationPermission", event.target.value || null)}
            >
              <option value="">Unknown</option>
              <option>Allowed</option>
              <option>Do not contact</option>
            </select>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Use Save at the top or Ctrl+S.</p>
      </form>
    </div>
  );
}
